import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, EmptyState, LoadingState } from "@/components/PageHeader";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transactions")({ component: TxPage });

function TxPage() {
  const { user } = useAuth();
  const { data, isLoading } = useFinanceData();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "expense" as "income" | "expense", amount: "", category: "Food", description: "", account_id: "", occurred_at: new Date().toISOString().slice(0, 10) });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (q && !(`${t.description ?? ""} ${t.category}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [data, q, filter]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: form.type as never,
      amount: Number(form.amount),
      category: form.category,
      description: form.description || null,
      account_id: form.account_id || null,
      occurred_at: form.occurred_at,
    });
    if (error) return toast.error(error.message);
    toast.success("Transaction added");
    setOpen(false);
    setForm({ ...form, amount: "", description: "" });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };
  const remove = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const currency = data?.profile?.currency ?? "USD";
  const cats = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <PageContainer>
      <PageHeader title="Transactions" subtitle={`${filtered.length} entries`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button style={{ background: "var(--gradient-gold)" }} className="text-accent-foreground"><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New transaction</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as never, category: v === "income" ? "Salary" : "Food" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Account</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{data?.accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></div>
                <Button onClick={save} disabled={!form.amount} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="glass rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        <div className="flex gap-1 glass p-1 rounded-lg">
          {(["all", "income", "expense"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-md ${filter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState title="No transactions" hint="Try changing filters or add one." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border/40">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Amount</th><th /></tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((t) => (
                <tr key={t.id} className="border-b border-border/20 hover:bg-white/[0.02] group">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(t.occurred_at)}</td>
                  <td className="px-4 py-3">{t.description || "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-white/5">{t.category}</span></td>
                  <td className={`px-4 py-3 text-right font-mono ${t.type === "income" ? "text-success" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "−"}{formatCurrency(Number(t.amount), currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}