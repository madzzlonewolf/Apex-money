import { createFileRoute, Link } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, EmptyState, LoadingState } from "@/components/PageHeader";
import { formatCurrency, formatCompact, formatDate } from "@/lib/format";
import { computeNetWorth, generateInsights, sumByMonth, monthKey } from "@/lib/insights";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Wallet, Sparkles, ArrowRight } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--gold)", "var(--success)"];

function DashboardPage() {
  const { data, isLoading } = useFinanceData();

  const computed = useMemo(() => {
    if (!data) return null;
    const netWorth = computeNetWorth(data.accounts);
    const byMonth = sumByMonth(data.transactions);
    const months = [...byMonth.keys()].sort();
    const trend = months.map((m) => ({
      month: m,
      income: byMonth.get(m)!.income,
      expense: byMonth.get(m)!.expense,
      net: byMonth.get(m)!.income - byMonth.get(m)!.expense,
    }));
    const thisKey = months[months.length - 1];
    const lastKey = months[months.length - 2];
    const thisM = thisKey ? byMonth.get(thisKey)! : { income: 0, expense: 0 };
    const lastM = lastKey ? byMonth.get(lastKey)! : { income: 0, expense: 0 };
    const savings = thisM.income - thisM.expense;
    const savingsRate = thisM.income > 0 ? (savings / thisM.income) * 100 : 0;
    // wealth growth approximation
    const wealth = trend.reduce<{ month: string; value: number }[]>((acc, t, i) => {
      const prev = i === 0 ? netWorth - trend.reduce((s, x) => s + x.net, 0) : acc[i - 1].value;
      acc.push({ month: t.month, value: prev + t.net });
      return acc;
    }, []);
    // category breakdown current month
    const catMap = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.type !== "expense" || monthKey(t.occurred_at) !== thisKey) continue;
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
    }
    const categories = [...catMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const accountBreakdown = data.accounts.map((a) => ({ name: a.name, value: Number(a.balance), color: a.color }));
    const insights = generateInsights({
      accounts: data.accounts,
      transactions: data.transactions,
      goals: data.goals,
      budgets: data.budgets,
      monthlyExpenses: Number(data.profile?.monthly_living_expenses ?? 0),
    });
    return { netWorth, trend, thisM, lastM, savings, savingsRate, wealth, categories, accountBreakdown, insights };
  }, [data]);

  if (isLoading) return <PageContainer><LoadingState /></PageContainer>;
  if (!data || data.accounts.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard" subtitle="Your wealth at a glance" />
        <div className="glass rounded-2xl p-10 text-center">
          <h3 className="font-display text-2xl mb-2">Welcome to Apex Finance</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Your account is clean. Add your first account to start tracking, or load a demo dataset to explore the app.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/accounts" className="px-5 py-2 rounded-lg text-accent-foreground" style={{ background: "var(--gradient-gold)" }}>Add an account</Link>
            <Link to="/settings" className="px-5 py-2 rounded-lg border border-border hover:bg-white/5">Load demo data</Link>
          </div>
        </div>
      </PageContainer>
    );
  }
  const c = computed!;
  const incomeDelta = c.lastM.income > 0 ? ((c.thisM.income - c.lastM.income) / c.lastM.income) * 100 : 0;
  const expenseDelta = c.lastM.expense > 0 ? ((c.thisM.expense - c.lastM.expense) / c.lastM.expense) * 100 : 0;
  const currency = data.profile?.currency ?? "USD";

  return (
    <PageContainer>
      <PageHeader title="Dashboard" subtitle="Your wealth at a glance" />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Kpi label="Net worth" value={formatCurrency(c.netWorth, currency)} icon={<Wallet className="h-4 w-4 text-gold" />} accent />
        <Kpi label="Income (this month)" value={formatCurrency(c.thisM.income, currency)} delta={incomeDelta} positive={incomeDelta >= 0} />
        <Kpi label="Spending (this month)" value={formatCurrency(c.thisM.expense, currency)} delta={expenseDelta} positive={expenseDelta < 0} />
        <Kpi label="Savings rate" value={`${c.savingsRate.toFixed(0)}%`} hint={c.savingsRate >= 20 ? "Healthy" : c.savingsRate >= 10 ? "Improving" : "Low"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl">Wealth trajectory</h2>
              <p className="text-xs text-muted-foreground">Net worth over the last {c.wealth.length} months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={c.wealth}>
              <defs>
                <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatCompact(v, currency)} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: number) => formatCurrency(v, currency)} />
              <Area type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={2} fill="url(#wealthGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Allocation</h2>
          {c.accountBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={c.accountBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {c.accountBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: number) => formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No accounts" />}
          <div className="mt-2 space-y-1 text-xs">
            {c.accountBreakdown.slice(0, 4).map((a, i) => (
              <div key={a.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="truncate">{a.name}</span>
                </div>
                <span className="text-muted-foreground">{formatCurrency(a.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-display text-xl mb-4">Income vs Spending</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={c.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatCompact(v, currency)} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: number) => formatCurrency(v, currency)} />
              <Bar dataKey="income" fill="var(--success)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">AI Insights</h2>
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <div className="space-y-3 max-h-[240px] overflow-y-auto">
            {c.insights.slice(0, 5).map((ins) => (
              <div key={ins.id} className="rounded-lg border border-border/40 p-3 bg-white/[0.02]">
                <div className={`text-xs uppercase tracking-wider mb-1 ${
                  ins.level === "critical" ? "text-destructive" : ins.level === "warning" ? "text-warning" : ins.level === "positive" ? "text-success" : "text-gold"
                }`}>{ins.level}</div>
                <div className="text-sm font-medium">{ins.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{ins.detail}</div>
              </div>
            ))}
            {c.insights.length === 0 && <p className="text-sm text-muted-foreground">No insights yet — add more activity.</p>}
          </div>
          <Link to="/insights" className="mt-4 inline-flex items-center gap-1 text-xs text-gold hover:underline">
            View all insights <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Recent transactions</h2>
            <Link to="/transactions" className="text-xs text-gold hover:underline">See all</Link>
          </div>
          <div className="space-y-2">
            {data.transactions.slice(0, 7).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                <div>
                  <div className="font-medium">{t.description || t.category}</div>
                  <div className="text-xs text-muted-foreground">{t.category} · {formatDate(t.occurred_at)}</div>
                </div>
                <div className={`font-mono ${t.type === "income" ? "text-success" : "text-foreground"}`}>
                  {t.type === "income" ? "+" : "−"}{formatCurrency(Number(t.amount), currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Top spending categories</h2>
          {c.categories.length > 0 ? (
            <div className="space-y-3">
              {c.categories.slice(0, 6).map((cat, i) => {
                const max = c.categories[0].value;
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{cat.name}</span>
                      <span className="text-muted-foreground font-mono">{formatCurrency(cat.value, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(cat.value / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="No spending this month" />}
        </div>
      </div>
    </PageContainer>
  );
}

function Kpi({ label, value, delta, positive, hint, icon, accent }: { label: string; value: string; delta?: number; positive?: boolean; hint?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-5 ${accent ? "border-gold/30" : ""}`} style={accent ? { boxShadow: "var(--shadow-gold)" } : undefined}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="font-display text-2xl">{value}</div>
      {typeof delta === "number" && (
        <div className={`mt-1 text-xs flex items-center gap-1 ${positive ? "text-success" : "text-destructive"}`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(delta).toFixed(0)}% vs last month
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}