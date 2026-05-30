import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./format";

export async function seedSampleData(userId: string) {
  // Insert accounts
  const accounts = [
    { name: "Wallet Cash", type: "cash", balance: 850, color: "#c9a84c" },
    { name: "Main Checking", type: "bank", balance: 4200, color: "#0d7a5f" },
    { name: "High-Yield Savings", type: "savings", balance: 12500, color: "#5cbdb9" },
    { name: "Emergency Reserve", type: "emergency", balance: 8500, color: "#e8b84a" },
    { name: "Trading Account", type: "trading", balance: 6300, color: "#a78bfa" },
    { name: "Index Portfolio", type: "investment", balance: 22400, color: "#0c2340" },
    { name: "BTC / ETH", type: "crypto", balance: 3100, color: "#f7931e" },
  ];
  const { data: insertedAccounts } = await supabase
    .from("accounts")
    .insert(accounts.map((a) => ({ ...a, user_id: userId, type: a.type as never })))
    .select();

  if (!insertedAccounts) return;

  const bank = insertedAccounts.find((a) => a.type === "bank")!;
  const cash = insertedAccounts.find((a) => a.type === "cash")!;

  // Generate 6 months of transactions
  const txs: Array<{
    user_id: string;
    account_id: string;
    type: "income" | "expense";
    amount: number;
    category: string;
    description: string;
    occurred_at: string;
  }> = [];
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    // Salary
    txs.push({
      user_id: userId,
      account_id: bank.id,
      type: "income",
      amount: 5200 + Math.round(Math.random() * 200),
      category: "Salary",
      description: "Monthly salary",
      occurred_at: new Date(base.getFullYear(), base.getMonth(), 1).toISOString().slice(0, 10),
    });
    // Side income
    if (Math.random() > 0.4) {
      txs.push({
        user_id: userId,
        account_id: bank.id,
        type: "income",
        amount: 400 + Math.round(Math.random() * 800),
        category: INCOME_CATEGORIES[1 + Math.floor(Math.random() * 4)],
        description: "Freelance project",
        occurred_at: new Date(base.getFullYear(), base.getMonth(), 12).toISOString().slice(0, 10),
      });
    }
    // Expenses
    const n = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const cat = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];
      const amt = {
        Food: 12 + Math.random() * 60,
        Transport: 8 + Math.random() * 30,
        Education: 20 + Math.random() * 80,
        Entertainment: 15 + Math.random() * 50,
        Shopping: 25 + Math.random() * 150,
        Bills: 80 + Math.random() * 200,
        Health: 20 + Math.random() * 100,
        Travel: 50 + Math.random() * 300,
        Subscription: 9 + Math.random() * 20,
        Other: 10 + Math.random() * 40,
      }[cat] ?? 30;
      txs.push({
        user_id: userId,
        account_id: Math.random() > 0.3 ? bank.id : cash.id,
        type: "expense",
        amount: Math.round(amt * 100) / 100,
        category: cat,
        description: `${cat} purchase`,
        occurred_at: new Date(base.getFullYear(), base.getMonth(), 2 + Math.floor(Math.random() * 26))
          .toISOString().slice(0, 10),
      });
    }
  }
  await supabase.from("transactions").insert(txs);

  // Goals
  await supabase.from("goals").insert([
    { user_id: userId, name: "New MacBook Pro", target_amount: 2800, current_amount: 1450, deadline: addMonths(4) },
    { user_id: userId, name: "Bali Vacation", target_amount: 3500, current_amount: 900, deadline: addMonths(8) },
    { user_id: userId, name: "Trading Capital Boost", target_amount: 10000, current_amount: 6300, deadline: addMonths(12) },
    { user_id: userId, name: "House Down Payment", target_amount: 40000, current_amount: 8200, deadline: addMonths(24) },
  ]);

  // Budgets for current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  await supabase.from("budgets").insert([
    { user_id: userId, month: monthStart, category: "Food", limit_amount: 600 },
    { user_id: userId, month: monthStart, category: "Transport", limit_amount: 250 },
    { user_id: userId, month: monthStart, category: "Entertainment", limit_amount: 200 },
    { user_id: userId, month: monthStart, category: "Shopping", limit_amount: 400 },
    { user_id: userId, month: monthStart, category: "Bills", limit_amount: 800 },
    { user_id: userId, month: monthStart, category: "Subscription", limit_amount: 100 },
  ]);

  // Profile expenses
  await supabase.from("profiles").update({ monthly_living_expenses: 2800 }).eq("id", userId);
}

function addMonths(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}