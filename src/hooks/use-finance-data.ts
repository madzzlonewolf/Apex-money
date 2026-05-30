import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { Account, Transaction, Goal, Budget, Profile } from "@/lib/insights";

export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  profile: Profile | null;
}

export function useFinanceData() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery<FinanceData>({
    queryKey: ["finance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [a, t, g, b, p] = await Promise.all([
        supabase.from("accounts").select("*").order("created_at", { ascending: true }),
        supabase.from("transactions").select("*").order("occurred_at", { ascending: false }).limit(1000),
        supabase.from("goals").select("*").order("created_at", { ascending: true }),
        supabase.from("budgets").select("*").order("month", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
      ]);
      return {
        accounts: a.data ?? [],
        transactions: t.data ?? [],
        goals: g.data ?? [],
        budgets: b.data ?? [],
        profile: p.data ?? null,
      };
    },
  });
}