import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, LoadingState } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/format";
import { emergencyStatus } from "@/lib/insights";
import { Progress } from "@/components/ui/progress";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/emergency")({ component: EmergencyPage });

function EmergencyPage() {
  const { user } = useAuth();
  const { data, isLoading } = useFinanceData();
  const qc = useQueryClient();
  const [monthly, setMonthly] = useState("");

  useEffect(() => {
    if (data?.profile) setMonthly(String(data.profile.monthly_living_expenses ?? 0));
  }, [data?.profile]);

  if (isLoading || !data) return <PageContainer><LoadingState /></PageContainer>;

  const currency = data.profile?.currency ?? "USD";
  const emergency = data.accounts.filter((a) => a.type === "emergency").reduce((s, a) => s + Number(a.balance), 0);
  const monthlyN = Number(monthly) || 0;
  const coverage = monthlyN > 0 ? emergency / monthlyN : 0;
  const status = emergencyStatus(coverage);
  const target = monthlyN * 6;
  const pct = target > 0 ? Math.min(100, (emergency / target) * 100) : 0;

  const saveExpenses = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ monthly_living_expenses: monthlyN }).eq("id", user.id);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  return (
    <PageContainer>
      <PageHeader title="Emergency Fund" subtitle="Your runway in the storm." />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-accent/15">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wider">Current coverage</div>
              <div className="font-display text-3xl">{coverage.toFixed(1)} months</div>
            </div>
          </div>
          <Progress value={pct} className="h-3 mb-3" />
          <div className="flex justify-between text-sm">
            <span className="font-mono">{formatCurrency(emergency, currency)}</span>
            <span className="text-muted-foreground font-mono">Target: {formatCurrency(target, currency)}</span>
          </div>
          <div className={`mt-4 inline-block px-3 py-1 rounded-full text-xs ${
            status.tone === "critical" ? "bg-destructive/20 text-destructive" :
            status.tone === "warning" ? "bg-warning/20 text-warning" :
            status.tone === "positive" ? "bg-success/20 text-success" : "bg-gold/20 text-gold"
          }`}>Status: {status.label}</div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Monthly expenses</h2>
          <Label>Living cost / month</Label>
          <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="mb-3" />
          <Button onClick={saveExpenses} className="w-full">Save</Button>
          <p className="text-xs text-muted-foreground mt-3">We use this to calculate emergency coverage and savings rate.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-xl mb-3">How it works</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Aim for at least 3 months of expenses to weather short shocks.</li>
          <li>• 6 months is the sweet spot for most professionals.</li>
          <li>• 12+ months gives freedom to take career risks.</li>
          <li>• Keep it in a high-yield savings account labelled <span className="text-foreground">Emergency</span>.</li>
        </ul>
      </div>
    </PageContainer>
  );
}