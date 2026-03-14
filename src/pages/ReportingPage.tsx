import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader, ErpCard, StatCard, Dot, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  intake: "#6b7280",
  quoted: "#eab308",
  in_progress: "#a78bfa",
  delivered: "#34d399",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

const HEALTH_COLORS: Record<string, string> = {
  green: "#22c55e",
  orange: "#f59e0b",
  red: "#ef4444",
  unknown: "#6b7280",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-erp-text0 text-xs shadow-lg">
      <div className="text-erp-text3 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <Dot color={p.color} size={6} />
          <span>{p.name}: €{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportingPage() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  // MRR from subscriptions
  const { data: mrr = 0 } = useQuery({
    queryKey: ["report-mrr", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions" as any)
        .select("monthly_amount")
        .eq("organization_id", orgId!)
        .eq("status", "active");
      if (error) return 0;
      return (data as any[])?.reduce((s: number, r: any) => s + (r.monthly_amount || 0), 0) ?? 0;
    },
  });

  // Pipeline value
  const { data: pipelineValue = 0 } = useQuery({
    queryKey: ["report-pipeline", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("value, pipeline_stages!inner(is_won, is_lost)")
        .eq("organization_id", orgId!);
      if (error) return 0;
      return (data as any[])
        ?.filter((d: any) => !d.pipeline_stages?.is_won && !d.pipeline_stages?.is_lost)
        .reduce((s: number, d: any) => s + (d.value || 0), 0) ?? 0;
    },
  });

  // Active projects count
  const { data: activeProjects = 0 } = useQuery({
    queryKey: ["report-active-projects", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .eq("status", "in_progress");
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Open tasks count
  const { data: openTasks = 0 } = useQuery({
    queryKey: ["report-open-tasks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .not("status", "in", "(done,cancelled)");
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Monthly snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ["report-snapshots", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("monthly_snapshots")
        .select("*")
        .eq("organization_id", orgId!)
        .order("snapshot_date");
      if (error) return [];
      return (data as any[])?.map((s: any) => ({
        ...s,
        label: format(new Date(s.snapshot_date), "MMM yy", { locale: nl }),
      })) ?? [];
    },
  });

  // Projects by status
  const { data: projectsByStatus = [] } = useQuery({
    queryKey: ["report-projects-status", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("status")
        .eq("organization_id", orgId!);
      if (error) return [];
      const counts: Record<string, number> = {};
      (data as any[])?.forEach((p: any) => {
        counts[p.status] = (counts[p.status] || 0) + 1;
      });
      return Object.entries(counts).map(([status, count]) => ({
        status,
        count,
        fill: STATUS_COLORS[status] || "#6b7280",
      }));
    },
  });

  // Company health distribution
  const { data: healthDist = [] } = useQuery({
    queryKey: ["report-health", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_company_health")
        .select("health_status")
        .eq("organization_id", orgId!);
      if (error) return [];
      const counts: Record<string, number> = {};
      (data as any[])?.forEach((h: any) => {
        const s = h.health_status || "unknown";
        counts[s] = (counts[s] || 0) + 1;
      });
      return Object.entries(counts).map(([status, count]) => ({
        name: status === "green" ? "Gezond" : status === "orange" ? "Aandacht" : status === "red" ? "Kritiek" : "Onbekend",
        value: count,
        fill: HEALTH_COLORS[status] || HEALTH_COLORS.unknown,
      }));
    },
  });

  // Deals in pipeline
  const { data: pipelineDeals = [] } = useQuery({
    queryKey: ["report-pipeline-deals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, probability, companies(name), pipeline_stages!inner(name, color, is_won, is_lost)")
        .eq("organization_id", orgId!);
      if (error) return [];
      return (data as any[])?.filter(
        (d: any) => !d.pipeline_stages?.is_won && !d.pipeline_stages?.is_lost
      ) ?? [];
    },
  });

  const axisStyle = { fontSize: 11, fill: "hsl(var(--erp-text-3))" };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Rapportages" desc="Overzicht van je belangrijkste metrics" />

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="MRR" value={fmt(mrr)} prefix="€" change="" up />
        <StatCard label="Pipeline" value={fmt(pipelineValue)} prefix="€" change="" up />
        <StatCard label="Actieve projecten" value={String(activeProjects)} change="" up />
        <StatCard label="Open taken" value={String(openTasks)} change="" up />
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* MRR Trend */}
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-4 text-erp-text0">MRR Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={snapshots}>
              <CartesianGrid stroke="hsl(var(--erp-border-0))" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `€${fmt(v)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total_mrr" stroke="#34d399" strokeWidth={2} dot={false} name="MRR" />
            </LineChart>
          </ResponsiveContainer>
        </ErpCard>

        {/* Pipeline Trend */}
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-4 text-erp-text0">Pipeline Waarde Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={snapshots}>
              <CartesianGrid stroke="hsl(var(--erp-border-0))" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `€${fmt(v)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="pipeline_value" stroke="#3b82f6" strokeWidth={2} dot={false} name="Pipeline" />
            </LineChart>
          </ResponsiveContainer>
        </ErpCard>

        {/* Projects by Status */}
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-4 text-erp-text0">Projecten per Status</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectsByStatus}>
              <CartesianGrid stroke="hsl(var(--erp-border-0))" strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--erp-bg-3))", border: "1px solid hsl(var(--erp-border-0))", borderRadius: 8, color: "hsl(var(--erp-text-0))", fontSize: 12 }}
              />
              <Bar dataKey="count" name="Projecten" radius={[4, 4, 0, 0]}>
                {projectsByStatus.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ErpCard>

        {/* Health Distribution */}
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-4 text-erp-text0">Klant Gezondheid</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={healthDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {healthDist.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--erp-bg-3))", border: "1px solid hsl(var(--erp-border-0))", borderRadius: 8, color: "hsl(var(--erp-text-0))", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ErpCard>
      </div>

      {/* Deals Table */}
      <ErpCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-erp-border0">
          <div className="text-[14px] font-semibold text-erp-text0">Deals in Pipeline</div>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr><TH>Titel</TH><TH>Bedrijf</TH><TH>Fase</TH><TH>Waarde</TH><TH>Kans</TH></tr>
          </thead>
          <tbody>
            {pipelineDeals.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-erp-text3 text-sm border-b border-erp-border0">Geen deals in pipeline</td></tr>
            )}
            {pipelineDeals.map((d: any) => (
              <TR key={d.id}>
                <TD><span className="text-erp-text0 font-medium">{d.title}</span></TD>
                <TD><span className="text-erp-text1">{d.companies?.name ?? "—"}</span></TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <Dot color={d.pipeline_stages?.color || "#6b7280"} size={7} />
                    <span className="text-erp-text1">{d.pipeline_stages?.name}</span>
                  </div>
                </TD>
                <TD><span className="text-erp-text0 font-medium">€{fmt(d.value || 0)}</span></TD>
                <TD><span className="text-erp-text2">{d.probability ?? 0}%</span></TD>
              </TR>
            ))}
          </tbody>
        </table>
      </ErpCard>
    </div>
  );
}
