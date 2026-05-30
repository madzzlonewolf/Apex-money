import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Shield, Target, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { seedSampleData } from "@/lib/seed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Apex Finance AI — Premium Wealth Intelligence" },
      { name: "description", content: "AI-powered personal finance platform. Track net worth, build wealth, hit financial goals." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && !loading) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        if (data.user && data.session) {
          toast.success("Welcome — seeding your dashboard...");
          await seedSampleData(data.user.id);
        } else {
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
            <span className="font-display font-bold text-background text-lg">A</span>
          </div>
          <div>
            <div className="font-display text-xl leading-none">Apex</div>
            <div className="text-[10px] tracking-[0.2em] text-gold uppercase">Finance AI</div>
          </div>
        </div>
      </header>

      <section className="container mx-auto grid lg:grid-cols-2 gap-12 px-6 py-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-xs mb-6">
            <Sparkles className="h-3 w-3 text-gold" />
            <span className="text-muted-foreground">AI-powered wealth intelligence</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.05] mb-6">
            Your private <span className="gradient-text-gold">wealth office</span>, powered by intelligence.
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            Track every dollar, automate your goals, and receive intelligent recommendations that compound into real wealth.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { icon: TrendingUp, label: "Net worth tracking" },
              { icon: Target, label: "Smart goal planning" },
              { icon: Shield, label: "Emergency readiness" },
              { icon: Sparkles, label: "AI recommendations" },
            ].map((f) => (
              <div key={f.label} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <f.icon className="h-4 w-4 text-gold" />
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="glass-strong rounded-2xl p-8 max-w-md w-full mx-auto">
          <div className="flex gap-1 p-1 glass rounded-lg mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm rounded-md transition-all ${mode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <Button type="button" onClick={handleGoogle} variant="outline" className="w-full mb-4 bg-white/5 border-white/10 hover:bg-white/10">
            Continue with Google
          </Button>

          <div className="relative my-4 text-center">
            <div className="absolute inset-x-0 top-1/2 border-t border-border/40" />
            <span className="relative bg-card px-3 text-xs text-muted-foreground">or with email</span>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name" className="text-xs">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full text-accent-foreground" style={{ background: "var(--gradient-gold)" }}>
              {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </motion.div>
      </section>
    </div>
  );
}