import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, LoadingState } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR", "BRL", "CHF"];

function ProfilePage() {
  const { user } = useAuth();
  const { data, isLoading } = useFinanceData();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [monthlyExpenses, setMonthlyExpenses] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.display_name ?? "");
      setCurrency(data.profile.currency ?? "USD");
      setMonthlyExpenses(String(data.profile.monthly_living_expenses ?? 0));
    }
  }, [data?.profile]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name,
      currency,
      monthly_living_expenses: Number(monthlyExpenses) || 0,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  if (isLoading) return <PageContainer><LoadingState /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Profile" subtitle="Your identity in Apex." />
      <div className="glass rounded-2xl p-6 max-w-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
            <User className="h-8 w-8 text-background" />
          </div>
          <div>
            <div className="font-display text-xl">{name || user?.email}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Monthly living expenses</Label>
            <Input type="number" step="0.01" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Used to compute emergency fund runway and savings rate.</p>
          </div>
          <Button onClick={save} disabled={busy} style={{ background: "var(--gradient-gold)" }} className="text-accent-foreground">
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}