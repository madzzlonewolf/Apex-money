import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Wallet, ArrowLeftRight, Target, Shield, PieChart, Sparkles, TrendingUp, Settings, LogOut, BarChart3, Calendar, Bell, User, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/emergency", label: "Emergency Fund", icon: Shield },
  { to: "/budgets", label: "Budgets", icon: PieChart },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
  { to: "/projection", label: "Projection", icon: TrendingUp },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };
  const Sidebar = (
    <>
      <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2 mb-6">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
          <span className="font-display font-bold text-background">A</span>
        </div>
        <div>
          <div className="font-display text-lg leading-none">Apex</div>
          <div className="text-[10px] tracking-widest text-gold uppercase">Finance AI</div>
        </div>
      </Link>
      {nav.map((n) => {
        const active = loc.pathname === n.to || loc.pathname.startsWith(n.to + "/");
        return (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              active ? "bg-accent/15 text-accent border border-accent/20" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}>
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
        );
      })}
      <button onClick={signOut} className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-white/5">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-64 flex-col glass-strong border-r border-border/40 p-5 gap-1 sticky top-0 h-screen overflow-y-auto">
        {Sidebar}
      </aside>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-72 flex flex-col glass-strong border-r border-border/40 p-5 gap-1 overflow-y-auto">
            {Sidebar}
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/40 glass-strong">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2"><Menu className="h-5 w-5" /></button>
          <div className="font-display text-lg">Apex</div>
          <button onClick={signOut} className="p-2 -mr-2"><LogOut className="h-5 w-5" /></button>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}