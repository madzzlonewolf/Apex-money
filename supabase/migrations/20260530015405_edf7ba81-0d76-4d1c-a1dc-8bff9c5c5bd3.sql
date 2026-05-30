
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency text not null default 'USD',
  monthly_living_expenses numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accounts
create type public.account_type as enum ('cash','bank','savings','emergency','trading','investment','crypto');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null,
  balance numeric not null default 0,
  color text not null default '#0d7a5f',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.accounts(user_id);

create table public.account_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  previous_balance numeric not null,
  new_balance numeric not null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.account_history(user_id);
create index on public.account_history(account_id);

-- Transactions
create type public.transaction_type as enum ('income','expense');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  type public.transaction_type not null,
  amount numeric not null check (amount >= 0),
  category text not null,
  description text,
  notes text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index on public.transactions(user_id);
create index on public.transactions(user_id, occurred_at desc);

-- Goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0,
  deadline date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.goals(user_id);

-- Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  category text not null,
  limit_amount numeric not null check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, month, category)
);
create index on public.budgets(user_id);

-- Net worth snapshots (for projections)
create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  total_net_worth numeric not null,
  created_at timestamptz not null default now(),
  unique(user_id, snapshot_date)
);
create index on public.net_worth_snapshots(user_id);

-- GRANTS
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.account_history to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.net_worth_snapshots to authenticated;

grant all on public.profiles to service_role;
grant all on public.accounts to service_role;
grant all on public.account_history to service_role;
grant all on public.transactions to service_role;
grant all on public.goals to service_role;
grant all on public.budgets to service_role;
grant all on public.net_worth_snapshots to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_history enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.budgets enable row level security;
alter table public.net_worth_snapshots enable row level security;

create policy "own_profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own_accounts" on public.accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_account_history" on public.account_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_transactions" on public.transactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_goals" on public.goals for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_budgets" on public.budgets for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_snapshots" on public.net_worth_snapshots for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to log account balance changes
create or replace function public.log_account_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.balance is distinct from new.balance then
    insert into public.account_history (user_id, account_id, previous_balance, new_balance, note)
    values (new.user_id, new.id, old.balance, new.balance, 'Balance updated');
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_account_balance_change
  before update on public.accounts
  for each row execute procedure public.log_account_change();
