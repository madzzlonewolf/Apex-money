import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { seedSampleData } from "@/lib/seed";
import { toast } from "sonner";
import { useState } from "react";
import { Database, LogOut, Trash2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const seed = async () => {
    if (!user) return;
    if (!confirm("Add sample data to your account?")) return;
    setBusy(true);
    await seedSampleData(user.id);
    setBusy(false);
    toast.success("Sample data added");
    qc.invalidateQueries({ queryKey: ["finance"] });
  };
  const wipe = async () => {
    if (!user) return;
    if (!confirm("This will delete ALL your financial data. Continue?")) return;
    setBusy(true);
    await Promise.all([
      supabase.from("transactions").delete().eq("user_id", user.id),
      supabase.from("budgets").delete().eq("user_id", user.id),
      supabase.from("goals").delete().eq("user_id", user.id),
      supabase.from("accounts").delete().eq("user_id", user.id),
    ]);
    setBusy(false);
    toast.success("Data cleared");
    qc.invalidateQueries({ queryKey: ["finance"] });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <PageContainer>
      <PageHeader title="Settings" subtitle="Manage your data and account." />
      <div className="space-y-4 max-w-2xl">
        <Row icon={<Sparkles className="h-5 w-5 text-gold" />} title="Seed sample data" desc="Populate accounts, transactions, goals, and budgets to explore the app.">
          <Button onClick={seed} disabled={busy} variant="outline">Seed</Button>
        </Row>
        <Row icon={<Database className="h-5 w-5 text-muted-foreground" />} title="Export data" desc="Download a JSON snapshot of all your data.">
          <Button variant="outline" onClick={() => toast.info("Coming soon")}>Export</Button>
        </Row>
        <Row icon={<Trash2 className="h-5 w-5 text-destructive" />} title="Clear all data" desc="Permanently delete accounts, transactions, budgets, and goals.">
          <Button onClick={wipe} disabled={busy} variant="destructive">Clear</Button>
        </Row>
        <Row icon={<LogOut className="h-5 w-5 text-muted-foreground" />} title="Sign out" desc="End your current session.">
          <Button onClick={signOut} variant="outline">Sign out</Button>
        </Row>
      </div>
    </PageContainer>
  );
}

function Row({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  );
}