import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, EmptyState, LoadingState } from "@/components/PageHeader";
import { formatCurrency, formatDate } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Plus, Target, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/goals")({ component: GoalsPage });

function GoalsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useFinanceData();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const empty = { id: "", name: "", target_amount: "", current_amount: "0", deadline: "" };
  const [form, setForm] = useState(empty);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (g: { id: string; name: string; target_amount: number | string; current_amount: number | string; deadline: string | null }) => {
    setForm({ id: g.id, name: g.name, target_amount: String(g.target_amount), current_amount: String(g.current_amount), deadline: g.deadline ?? "" });
    setOpen(true);
  };
  const save = async () => {
    if (!user) return;
    const payload = {
      name: form.name,
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount),
      deadline: form.deadline || null,
    };
    const { error } = form.id
      ? await supabase.from("goals").update(payload).eq("id", form.id)
      : await supabase.from("goals").insert({ ...payload, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Goal updated" : "Goal added");
    setOpen(false);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await supabase.from("goals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const currency = data?.profile?.currency ?? "USD";

  return (
    <PageContainer>
      <PageHeader title="Goals" subtitle="Save with intent. Reach faster."
        actions={
          <Button onClick={openNew} style={{ background: "var(--gradient-gold)" }} className="text-accent-foreground">
            <Plus className="h-4 w-4 mr-1" /> New goal
          </Button>
        }
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit goal" : "New goal"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target</Label><Input type="number" step="0.01" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} /></div>
              <div><Label>Current</Label><Input type="number" step="0.01" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} /></div>
            </div>
            <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            <Button onClick={save} disabled={!form.name || !form.target_amount} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      {isLoading ? <LoadingState /> : !data || data.goals.length === 0 ? (
        <EmptyState title="No goals yet" hint="Set your first wealth target." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.goals.map((g) => {
            const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
            return (
              <div key={g.id} className="glass rounded-2xl p-6 relative group">
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(g as never)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent/15">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-display text-lg">{g.name}</div>
                    {g.deadline && <div className="text-xs text-muted-foreground">By {formatDate(g.deadline)}</div>}
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-mono">{formatCurrency(Number(g.current_amount), currency)}</span>
                  <span className="text-muted-foreground font-mono">/ {formatCurrency(Number(g.target_amount), currency)}</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% complete</span>
                  <Button size="sm" variant="outline" onClick={() => openEdit(g as never)}>Update</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}