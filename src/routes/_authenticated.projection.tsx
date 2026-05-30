import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/use-finance-data";
import { PageContainer, PageHeader, LoadingState } from "@/components/PageHeader";
import { formatCurrency, formatCompact } from "@/lib/format";
import { computeNetWorth, projectWealth } from "@/lib/insights";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/projection")({ component: ProjectionPage });

function ProjectionPage() {
  const { data, isLoading } = useFinanceData();
  const [monthly, setMonthly] = useState("1500");
  const [annual, setAnnual] = useState("8");
  const [years, setYears] = useState("20");

  const computed = useMemo(() => {
    if (!data) return null;
    const nw = computeNetWorth(data.accounts);
    const points = projectWealth({
      currentWealth: nw, monthlyContribution: Number(monthly) || 0,
      annualReturn: Number(annual) || 0, years: Number(years) || 0,
    });
    return { nw, points, final: points[points.length - 1].value };
  }, [data, monthly, annual, years]);

  if (isLoading || !computed) return <PageContainer><LoadingState /></PageContainer>;
  const currency = data?.profile?.currency ?? "USD";

  return (
    <PageContainer>
      <PageHeader title="Wealth Projection" subtitle="See compounding in motion." />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="glass rounded-2xl p-5">
          <Label className="text-xs">Monthly contribution</Label>
          <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </div>
        <div className="glass rounded-2xl p-5">
          <Label className="text-xs">Annual return (%)</Label>
          <Input type="number" value={annual} onChange={(e) => setAnnual(e.target.value)} />
        </div>
        <div className="glass rounded-2xl p-5">
          <Label className="text-xs">Years</Label>
          <Input type="number" value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
      </div>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Projected wealth in {years} years</div>
            <div className="font-display text-4xl gradient-text-gold">{formatCurrency(computed.final, currency)}</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Today</div>
            <div className="font-mono">{formatCurrency(computed.nw, currency)}</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={computed.points}>
            <defs>
              <linearGradient id="proj" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(m) => `Y${Math.floor(m / 12)}`} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatCompact(v, currency)} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              labelFormatter={(m) => `Month ${m}`} formatter={(v: number) => formatCurrency(v, currency)} />
            <Area type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={2} fill="url(#proj)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </PageContainer>
  );
}