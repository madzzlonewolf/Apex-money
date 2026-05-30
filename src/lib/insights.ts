import type { Tables } from "@/integrations/supabase/types";

export type Account = Tables<"accounts">;
export type Transaction = Tables<"transactions">;
export type Goal = Tables<"goals">;
export type Budget = Tables<"budgets">;
export type Profile = Tables<"profiles">;

export interface Insight {
  id: string;
  level: "positive" | "info" | "warning" | "critical";
  title: string;
  detail: string;
}

export function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function sumByMonth(transactions: Transaction[]) {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const key = monthKey(t.occurred_at);
    const m = map.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") m.income += Number(t.amount);
    else m.expense += Number(t.amount);
    map.set(key, m);
  }
  return map;
}

export function computeNetWorth(accounts: Account[]) {
  return accounts.reduce((s, a) => s + Number(a.balance), 0);
}

export function emergencyStatus(coverageMonths: number): { label: string; tone: Insight["level"] } {
  if (coverageMonths < 1) return { label: "Critical", tone: "critical" };
  if (coverageMonths < 3) return { label: "Low", tone: "warning" };
  if (coverageMonths < 6) return { label: "Moderate", tone: "info" };
  if (coverageMonths < 12) return { label: "Safe", tone: "positive" };
  return { label: "Excellent", tone: "positive" };
}

export function financialHealthScore(input: {
  savingsRate: number;
  emergencyCoverage: number;
  goalsOnTrack: number;
  budgetAdherence: number;
}) {
  const sr = Math.min(40, Math.max(0, input.savingsRate * 1.5));
  const ec = Math.min(25, (input.emergencyCoverage / 6) * 25);
  const g = Math.min(15, input.goalsOnTrack * 15);
  const b = Math.min(20, input.budgetAdherence * 20);
  return Math.round(sr + ec + g + b);
}

export function generateInsights(params: {
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  monthlyExpenses: number;
}): Insight[] {
  const { accounts, transactions, goals, budgets, monthlyExpenses } = params;
  const insights: Insight[] = [];
  const byMonth = sumByMonth(transactions);
  const months = [...byMonth.keys()].sort();
  const last = months[months.length - 1];
  const prev = months[months.length - 2];

  if (last && prev) {
    const a = byMonth.get(last)!;
    const b = byMonth.get(prev)!;
    if (b.expense > 0) {
      const delta = ((a.expense - b.expense) / b.expense) * 100;
      if (Math.abs(delta) > 8) {
        insights.push({
          id: "exp-trend",
          level: delta > 0 ? "warning" : "positive",
          title: delta > 0
            ? `Spending up ${delta.toFixed(0)}% vs last month`
            : `Spending down ${Math.abs(delta).toFixed(0)}% vs last month`,
          detail: `Last month: $${b.expense.toFixed(0)} · This month: $${a.expense.toFixed(0)}`,
        });
      }
    }
    if (a.income > 0) {
      const rate = ((a.income - a.expense) / a.income) * 100;
      insights.push({
        id: "save-rate",
        level: rate >= 25 ? "positive" : rate >= 10 ? "info" : "warning",
        title: `Savings rate ${rate.toFixed(0)}% this month`,
        detail: rate >= 25 ? "Outstanding — keep compounding." : rate < 10 ? "Aim for at least 20%." : "Solid, push toward 25%.",
      });
    }
  }

  // Emergency fund
  const emergency = accounts.filter((a) => a.type === "emergency").reduce((s, a) => s + Number(a.balance), 0);
  if (monthlyExpenses > 0) {
    const coverage = emergency / monthlyExpenses;
    const s = emergencyStatus(coverage);
    insights.push({
      id: "emergency",
      level: s.tone,
      title: `Emergency fund covers ${coverage.toFixed(1)} months`,
      detail: `Status: ${s.label}. Target is 6 months ($${(monthlyExpenses * 6).toFixed(0)}).`,
    });
  }

  // Category spike
  const catMap = new Map<string, { last: number; prev: number }>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const key = monthKey(t.occurred_at);
    const c = catMap.get(t.category) ?? { last: 0, prev: 0 };
    if (key === last) c.last += Number(t.amount);
    if (key === prev) c.prev += Number(t.amount);
    catMap.set(t.category, c);
  }
  for (const [cat, v] of catMap) {
    if (v.prev > 50 && v.last > v.prev * 1.15) {
      insights.push({
        id: `cat-${cat}`,
        level: "warning",
        title: `${cat} spending up ${Math.round(((v.last - v.prev) / v.prev) * 100)}%`,
        detail: `From $${v.prev.toFixed(0)} to $${v.last.toFixed(0)}.`,
      });
      break;
    }
  }

  // Goal progress
  for (const g of goals.slice(0, 1)) {
    const pct = (Number(g.current_amount) / Number(g.target_amount)) * 100;
    if (pct >= 100) {
      insights.push({ id: `g-${g.id}`, level: "positive", title: `Goal reached: ${g.name}`, detail: "Time to set the next one." });
    } else {
      insights.push({
        id: `g-${g.id}`,
        level: "info",
        title: `${g.name}: ${pct.toFixed(0)}% complete`,
        detail: `$${Number(g.current_amount).toFixed(0)} of $${Number(g.target_amount).toFixed(0)}.`,
      });
    }
  }

  // Budget breach
  const thisMonthFirst = last ? `${last}-01` : null;
  if (thisMonthFirst) {
    const monthBudgets = budgets.filter((b) => b.month.startsWith(last!));
    for (const b of monthBudgets) {
      const spent = transactions
        .filter((t) => t.type === "expense" && t.category === b.category && monthKey(t.occurred_at) === last)
        .reduce((s, t) => s + Number(t.amount), 0);
      if (spent > Number(b.limit_amount)) {
        insights.push({
          id: `b-${b.id}`,
          level: "critical",
          title: `${b.category} budget exceeded`,
          detail: `Spent $${spent.toFixed(0)} of $${Number(b.limit_amount).toFixed(0)} limit.`,
        });
        break;
      }
    }
  }

  return insights;
}

export function projectWealth(opts: {
  currentWealth: number;
  monthlyContribution: number;
  annualReturn: number; // percent
  years: number;
}) {
  const monthlyRate = opts.annualReturn / 100 / 12;
  const months = opts.years * 12;
  const points: { month: number; value: number }[] = [];
  let v = opts.currentWealth;
  for (let i = 0; i <= months; i++) {
    points.push({ month: i, value: v });
    v = v * (1 + monthlyRate) + opts.monthlyContribution;
  }
  return points;
}