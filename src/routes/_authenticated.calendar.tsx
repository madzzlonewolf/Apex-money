import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, LoadingState } from "@/components/PageHeader";
import { formatCurrency, formatDate } from "@/lib/format";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { data, isLoading } = useFinanceData();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startPad = first.getDay();
    const arr: { date: Date | null; income: number; expense: number }[] = [];
    for (let i = 0; i < startPad; i++) arr.push({ date: null, income: 0, expense: 0 });
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const iso = date.toISOString().slice(0, 10);
      const txs = data?.transactions.filter((t) => t.occurred_at === iso) ?? [];
      arr.push({
        date,
        income: txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        expense: txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return arr;
  }, [month, data]);

  const [sel, setSel] = useState<Date | null>(null);
  if (isLoading || !data) return <PageContainer><LoadingState /></PageContainer>;
  const currency = data.profile?.currency ?? "USD";
  const selTxs = sel ? data.transactions.filter((t) => t.occurred_at === sel.toISOString().slice(0, 10)) : [];

  return (
    <PageContainer>
      <PageHeader title="Financial Calendar" subtitle="Money in and out, day by day." />

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-2 hover:bg-white/5 rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
          <div className="font-display text-xl">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-2 hover:bg-white/5 rounded-lg"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <button key={i} disabled={!d.date} onClick={() => d.date && setSel(d.date)}
              className={`aspect-square p-1.5 rounded-lg border text-left text-xs transition ${
                !d.date ? "border-transparent" :
                sel?.toDateString() === d.date?.toDateString() ? "border-gold bg-gold/10" :
                "border-border/30 hover:bg-white/5"
              }`}>
              {d.date && (
                <>
                  <div className="text-foreground">{d.date.getDate()}</div>
                  {d.income > 0 && <div className="text-success text-[10px] truncate">+{Math.round(d.income)}</div>}
                  {d.expense > 0 && <div className="text-destructive text-[10px] truncate">−{Math.round(d.expense)}</div>}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {sel && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">{formatDate(sel)}</h2>
          {selTxs.length === 0 ? <p className="text-sm text-muted-foreground">No activity.</p> : (
            <div className="space-y-2">
              {selTxs.map((t) => (
                <div key={t.id} className="flex justify-between text-sm py-2 border-b border-border/30 last:border-0">
                  <span>{t.description || t.category}</span>
                  <span className={`font-mono ${t.type === "income" ? "text-success" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "−"}{formatCurrency(Number(t.amount), currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}