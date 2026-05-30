import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, EmptyState, LoadingState } from "@/components/PageHeader";
import { formatCurrency, ACCOUNT_TYPE_LABELS } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Wallet, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accounts")({ component: AccountsPage });

type FormState = { id?: string; name: string; type: string; balance: string; color: string };
const empty: FormState = { name: "", type: "bank", balance: "0", color: "#0d7a5f" };

function AccountsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useFinanceData();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (a: { id: string; name: string; type: string; balance: number | string; color: string | null }) => {
    setForm({ id: a.id, name: a.name, type: a.type, balance: String(a.balance), color: a.color || "#0d7a5f" });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const payload = { name: form.name, type: form.type as never, balance: Number(form.balance) || 0, color: form.color };
    const { error } = form.id
      ? await supabase.from("accounts").update(payload).eq("id", form.id)
      : await supabase.from("accounts").insert({ ...payload, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Account updated" : "Account added");
    setOpen(false);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this account? Related transactions will remain.")) return;
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Account deleted");
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const currency = data?.profile?.currency ?? "USD";
  const total = data?.accounts.reduce((s, a) => s + Number(a.balance), 0) ?? 0;

  return (
    <PageContainer>
      <PageHeader title="Accounts" subtitle={`Total balance: ${formatCurrency(total, currency)}`}
        actions={
          <Button onClick={openNew} style={{ background: "var(--gradient-gold)" }} className="text-accent-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add account
          </Button>
        }
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit account" : "New account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Balance</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
            <div><Label>Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            <Button onClick={save} disabled={!form.name} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      {isLoading ? <LoadingState /> : !data || data.accounts.length === 0 ? (
        <EmptyState title="No accounts" hint="Add your first account to start tracking." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => openEdit(a as never)}
              className="glass rounded-2xl p-5 relative group text-left hover:border-gold/40 transition"
            >
              <span
                onClick={(e) => { e.stopPropagation(); remove(a.id); }}
                role="button"
                tabIndex={0}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: a.color || "var(--primary)" }}>
                  <Wallet className="h-5 w-5 text-background" />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-1.5">{a.name} <Pencil className="h-3 w-3 text-muted-foreground" /></div>
                  <div className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[a.type] ?? a.type}</div>
                </div>
              </div>
              <div className="font-display text-2xl">{formatCurrency(Number(a.balance), currency)}</div>
            </button>
          ))}
        </div>
      )}
    </PageContainer>
  );
}