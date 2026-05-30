import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, LoadingState, EmptyState } from "@/components/PageHeader";
import { generateInsights, financialHealthScore, sumByMonth } from "@/lib/insights";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/insights")({ component: InsightsPage });

function InsightsPage() {
  const { data, isLoading } = useFinanceData();

  const computed = useMemo(() => {
    if (!data) return null;
    const monthlyExpenses = Number(data.profile?.monthly_living_expenses ?? 0);
    const insights = generateInsights({
      accounts: data.accounts, transactions: data.transactions, goals: data.goals,
      budgets: data.budgets, monthlyExpenses,
    });
    const byMonth = sumByMonth(data.transactions);
    const keys = [...byMonth.keys()].sort();
    const last = keys[keys.length - 1];
    const m = last ? byMonth.get(last)! : { income: 0, expense: 0 };
    const savingsRate = m.income > 0 ? ((m.income - m.expense) / m.income) * 100 : 0;
    const emergency = data.accounts.filter((a) => a.type === "emergency").reduce((s, a) => s + Number(a.balance), 0);
    const coverage = monthlyExpenses > 0 ? emergency / monthlyExpenses : 0;
    const goalsOnTrack = data.goals.length > 0 ? data.goals.filter((g) => Number(g.current_amount) / Number(g.target_amount) >= 0.5).length / data.goals.length : 0;
    const monthBudgets = data.budgets.filter((b) => last && b.month.startsWith(last));
    let breaches = 0;
    for (const b of monthBudgets) {
      const spent = data.transactions
        .filter((t) => t.type === "expense" && t.category === b.category && last && t.occurred_at.startsWith(last))
        .reduce((s, t) => s + Number(t.amount), 0);
      if (spent > Number(b.limit_amount)) breaches++;
    }
    const budgetAdherence = monthBudgets.length > 0 ? 1 - breaches / monthBudgets.length : 0.8;
    const score = financialHealthScore({ savingsRate, emergencyCoverage: coverage, goalsOnTrack, budgetAdherence });
    return { insights, score, savingsRate, coverage };
  }, [data]);

  if (isLoading || !computed) return <PageContainer><LoadingState /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="AI Insights" subtitle="Intelligent analysis of your financial behavior." />

      <div className="glass rounded-2xl p-6 mb-6 flex items-center gap-6">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="var(--border)" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="42" stroke="var(--gold)" strokeWidth="8" fill="none"
              strokeDasharray={`${(computed.score / 100) * 264} 264`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display text-2xl">{computed.score}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Financial Health Score</div>
          <div className="font-display text-2xl mb-1">
            {computed.score >= 80 ? "Excellent" : computed.score >= 60 ? "Strong" : computed.score >= 40 ? "Moderate" : "Needs work"}
          </div>
          <div className="text-sm text-muted-foreground">
            Savings rate {computed.savingsRate.toFixed(0)}% · Emergency coverage {computed.coverage.toFixed(1)}mo
          </div>
        </div>
      </div>

      {computed.insights.length === 0 ? <EmptyState title="No insights yet" hint="Add transactions and goals to unlock analysis." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {computed.insights.map((ins) => (
            <div key={ins.id} className="glass rounded-2xl p-5 flex gap-3">
              <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                ins.level === "critical" ? "bg-destructive/20" : ins.level === "warning" ? "bg-warning/20" : ins.level === "positive" ? "bg-success/20" : "bg-gold/20"
              }`}>
                <Sparkles className={`h-4 w-4 ${
                  ins.level === "critical" ? "text-destructive" : ins.level === "warning" ? "text-warning" : ins.level === "positive" ? "text-success" : "text-gold"
                }`} />
              </div>
              <div>
                <div className="font-medium">{ins.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{ins.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}