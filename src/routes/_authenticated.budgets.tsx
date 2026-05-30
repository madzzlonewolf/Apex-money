import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, EmptyState, LoadingState } from "@/components/PageHeader";
import { formatCurrency, EXPENSE_CATEGORIES } from "@/lib/format";
import { monthKey } from "@/lib/insights";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/budgets")({ component: BudgetsPage });

function BudgetsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useFinanceData();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const empty = { id: "", category: "Food", limit_amount: "" };
  const [form, setForm] = useState(empty);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthStart = `${currentMonth}-01`;

  const items = useMemo(() => {
    if (!data) return [];
    const monthBudgets = data.budgets.filter((b) => b.month.startsWith(currentMonth));
    return monthBudgets.map((b) => {
      const spent = data.transactions
        .filter((t) => t.type === "expense" && t.category === b.category && monthKey(t.occurred_at) === currentMonth)
        .reduce((s, t) => s + Number(t.amount), 0);
      return { ...b, spent, pct: Math.min(100, (spent / Number(b.limit_amount)) * 100) };
    });
  }, [data, currentMonth]);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (b: { id: string; category: string; limit_amount: number | string }) => {
    setForm({ id: b.id, category: b.category, limit_amount: String(b.limit_amount) });
    setOpen(true);
  };
  const save = async () => {
    if (!user) return;
    const { error } = form.id
      ? await supabase.from("budgets").update({ category: form.category, limit_amount: Number(form.limit_amount) }).eq("id", form.id)
      : await supabase.from("budgets").insert({ user_id: user.id, month: monthStart, category: form.category, limit_amount: Number(form.limit_amount) });
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Budget updated" : "Budget added");
    setOpen(false);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    await supabase.from("budgets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const currency = data?.profile?.currency ?? "USD";
  const total = items.reduce((s, i) => s + Number(i.limit_amount), 0);
  const totalSpent = items.reduce((s, i) => s + i.spent, 0);

  return (
    <PageContainer>
      <PageHeader title="Budgets" subtitle={`This month: ${formatCurrency(totalSpent, currency)} of ${formatCurrency(total, currency)}`}
        actions={
          <Button onClick={openNew} style={{ background: "var(--gradient-gold)" }} className="text-accent-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add budget
          </Button>
        }
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit budget" : "New budget"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Monthly limit</Label><Input type="number" step="0.01" value={form.limit_amount} onChange={(e) => setForm({ ...form, limit_amount: e.target.value })} /></div>
            <Button onClick={save} disabled={!form.limit_amount} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      {isLoading ? <LoadingState /> : items.length === 0 ? (
        <EmptyState title="No budgets this month" hint="Set monthly limits to stay on track." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((b) => {
            const over = b.spent > Number(b.limit_amount);
            return (
              <div key={b.id} className="glass rounded-2xl p-5 group relative">
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(b as never)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="flex justify-between mb-2">
                  <div className="font-medium">{b.category}</div>
                  <div className={`text-sm font-mono ${over ? "text-destructive" : "text-muted-foreground"}`}>
                    {formatCurrency(b.spent, currency)} / {formatCurrency(Number(b.limit_amount), currency)}
                  </div>
                </div>
                <Progress value={b.pct} className="h-2" />
                <div className="text-xs text-muted-foreground mt-2">
                  {over ? `Over by ${formatCurrency(b.spent - Number(b.limit_amount), currency)}` : `${formatCurrency(Number(b.limit_amount) - b.spent, currency)} remaining`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}