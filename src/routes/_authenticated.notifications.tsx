import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, LoadingState, EmptyState } from "@/components/PageHeader";
import { generateInsights } from "@/lib/insights";
import { formatDate } from "@/lib/format";
import { Bell, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { data, isLoading } = useFinanceData();

  const notifications = useMemo(() => {
    if (!data) return [];
    const items: { id: string; title: string; detail: string; level: "critical" | "warning" | "info" | "positive"; date: string }[] = [];
    const monthlyExpenses = Number(data.profile?.monthly_living_expenses ?? 0);
    const insights = generateInsights({
      accounts: data.accounts, transactions: data.transactions, goals: data.goals,
      budgets: data.budgets, monthlyExpenses,
    });
    insights.forEach((i) => items.push({ id: i.id, title: i.title, detail: i.detail, level: i.level, date: new Date().toISOString() }));
    // Goal deadlines approaching
    for (const g of data.goals) {
      if (!g.deadline) continue;
      const days = Math.round((new Date(g.deadline).getTime() - Date.now()) / 86400000);
      if (days > 0 && days < 30) {
        items.push({ id: `gd-${g.id}`, title: `${g.name} due in ${days} days`, detail: "Stay on pace with your contributions.", level: "warning", date: g.deadline });
      }
    }
    // Recent large transactions
    const last = data.transactions[0];
    if (last) items.push({ id: `t-${last.id}`, title: `New ${last.type}: ${last.description || last.category}`, detail: `Recorded ${formatDate(last.occurred_at)}.`, level: "info", date: last.occurred_at });
    return items;
  }, [data]);

  if (isLoading) return <PageContainer><LoadingState /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Notifications" subtitle="Smart alerts about your money." />
      {notifications.length === 0 ? <EmptyState title="All clear" hint="We'll alert you when something needs attention." /> : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = n.level === "critical" || n.level === "warning" ? AlertTriangle : n.level === "positive" ? CheckCircle2 : Info;
            const color = n.level === "critical" ? "text-destructive bg-destructive/15" :
                          n.level === "warning" ? "text-warning bg-warning/15" :
                          n.level === "positive" ? "text-success bg-success/15" : "text-gold bg-gold/15";
            return (
              <div key={n.id} className="glass rounded-xl p-4 flex gap-3 items-start">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-muted-foreground">{n.detail}</div>
                </div>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}