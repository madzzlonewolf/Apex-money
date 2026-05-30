import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, LoadingState, EmptyState } from "@/components/PageHeader";
import { formatCurrency, formatCompact } from "@/lib/format";
import { sumByMonth, monthKey } from "@/lib/insights";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--gold)"];

function AnalyticsPage() {
  const { data, isLoading } = useFinanceData();

  const computed = useMemo(() => {
    if (!data) return null;
    const byMonth = sumByMonth(data.transactions);
    const trend = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({
      month: m, income: v.income, expense: v.expense, savings: v.income - v.expense,
    }));
    const catTotals = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.type !== "expense") continue;
      catTotals.set(t.category, (catTotals.get(t.category) ?? 0) + Number(t.amount));
    }
    const cats = [...catTotals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const incomeCats = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.type !== "income") continue;
      incomeCats.set(t.category, (incomeCats.get(t.category) ?? 0) + Number(t.amount));
    }
    const incomes = [...incomeCats.entries()].map(([name, value]) => ({ name, value }));
    // weekday spending
    const wd = [0, 0, 0, 0, 0, 0, 0];
    for (const t of data.transactions) {
      if (t.type !== "expense") continue;
      wd[new Date(t.occurred_at).getDay()] += Number(t.amount);
    }
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => ({ day: d, value: wd[i] }));
    return { trend, cats, incomes, weekdays };
  }, [data]);

  if (isLoading || !computed || !data) return <PageContainer><LoadingState /></PageContainer>;
  if (data.transactions.length === 0) return <PageContainer><PageHeader title="Analytics" /><EmptyState title="No data" hint="Add transactions to see analytics." /></PageContainer>;

  const currency = data.profile?.currency ?? "USD";

  return (
    <PageContainer>
      <PageHeader title="Analytics" subtitle="Deep insight into your money flow." />

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Savings trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={computed.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatCompact(v, currency)} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatCurrency(v, currency)} />
              <Line type="monotone" dataKey="savings" stroke="var(--gold)" strokeWidth={2} dot={{ fill: "var(--gold)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Spending by category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={computed.cats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={95} paddingAngle={2}>
                {computed.cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatCurrency(v, currency)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Spending by weekday</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={computed.weekdays}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatCompact(v, currency)} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatCurrency(v, currency)} />
              <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Income sources</h2>
          {computed.incomes.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={computed.incomes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatCompact(v, currency)} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatCurrency(v, currency)} />
                <Bar dataKey="value" fill="var(--success)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No income yet.</p>}
        </div>
      </div>
    </PageContainer>
  );
}