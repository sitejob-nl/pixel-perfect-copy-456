import { useState } from "react";
import { StatCard, ErpCard, Dot, Chip, PageHeader, ErpButton, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import CreateActivityDialog from "@/components/erp/CreateActivityDialog";

export default function DashboardPage() {
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  // Pipeline value + open deals
  const { data: dealStats } = useQuery({
    queryKey: ["dashboard-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("value, stage_id, pipeline_stages(name, color, is_won, is_lost, sort_order)");
      if (error) throw error;
      return data;
    },
  });

  // MRR from subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ["dashboard-mrr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("monthly_amount")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });


  const { data: hotCount } = useQuery({
    queryKey: ["dashboard-hot-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("temperature", "hot");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Recent activities
  const { data: activities = [] } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, subject, activity_type, created_at, status")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const openDeals = dealStats?.filter(d => {
    const stage = d.pipeline_stages as any;
    return stage && !stage.is_won && !stage.is_lost;
  }) ?? [];
  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const mrr = subscriptions?.reduce((sum, s) => sum + (s.monthly_amount ?? 0), 0) ?? 0;

  // Pipeline distribution
  const stageMap = new Map<string, { name: string; color: string; count: number; total: number; sort: number }>();
  openDeals.forEach(d => {
    const stage = d.pipeline_stages as any;
    if (!stage) return;
    const key = stage.name;
    const existing = stageMap.get(key);
    if (existing) {
      existing.count++;
      existing.total += d.value ?? 0;
    } else {
      stageMap.set(key, { name: stage.name, color: stage.color ?? "#6b7280", count: 1, total: d.value ?? 0, sort: stage.sort_order ?? 0 });
    }
  });
  const stages = Array.from(stageMap.values()).sort((a, b) => a.sort - b.sort);
  const maxTotal = Math.max(...stages.map(s => s.total), 1);

  const activityIcon = (type: string) => {
    switch (type) {
      case "call": return "📞";
      case "email": return "📧";
      case "meeting": return "🤝";
      case "note": return "📝";
      case "task": return "✅";
      default: return "⚡";
    }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Dashboard" desc="Hier is je overzicht voor vandaag.">
        <ErpButton><Icons.Calendar className="w-4 h-4" /> Deze maand <Icons.ChevDown className="w-3 h-3" /></ErpButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard label="Pipeline waarde" value={pipelineValue >= 1000 ? `${(pipelineValue / 1000).toFixed(1)}K` : String(pipelineValue)} prefix="€" change={`${openDeals.length} open deals`} up />
        <StatCard label="Open deals" value={String(openDeals.length)} change="actief in pipeline" up />
        <StatCard label="MRR" value={mrr >= 1000 ? `${(mrr / 1000).toFixed(1)}K` : String(mrr)} prefix="€" change="maandelijkse omzet" up />
        <StatCard label="Hot leads" value={String(hotCount ?? 0)} change="hoge temperatuur" up />
      </div>

      {/* Pipeline distribution + Activities */}
      <div className="grid grid-cols-[3fr_2fr] gap-[14px] mb-6">
        <ErpCard className="p-5">
          <div className="text-[15px] font-semibold mb-4">Pipeline verdeling</div>
          {stages.length === 0 && (
            <div className="text-sm text-erp-text3 py-4">Nog geen deals in de pipeline.</div>
          )}
          {stages.map(st => {
            const pct = Math.round((st.total / maxTotal) * 100);
            return (
              <div key={st.name} className="mb-[14px]">
                <div className="flex justify-between mb-[5px]">
                  <span className="text-xs text-erp-text1 flex items-center gap-[6px]">
                    <Dot color={st.color} /> {st.name} <span className="text-erp-text3">({st.count})</span>
                  </span>
                  <span className="text-xs font-semibold">€{fmt(st.total)}</span>
                </div>
                <div className="h-[5px] bg-erp-bg4 rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, background: st.color }} />
                </div>
              </div>
            );
          })}
          {stages.length > 0 && (
            <div className="flex gap-7 pt-3 border-t border-erp-border0 mt-4">
              <div><div className="text-[11px] text-erp-text3">Totale waarde</div><div className="text-lg font-bold mt-[2px]">€{fmt(pipelineValue)}</div></div>
              <div><div className="text-[11px] text-erp-text3">MRR</div><div className="text-lg font-bold mt-[2px] text-erp-green">€{fmt(mrr)}</div></div>
            </div>
          )}
        </ErpCard>

        <ErpCard className="p-5">
          <div className="flex justify-between mb-[14px]">
            <span className="text-[15px] font-semibold">Recente activiteit</span>
            <ErpButton onClick={() => setActivityDialogOpen(true)}><Icons.Plus className="w-3.5 h-3.5" /> Loggen</ErpButton>
          </div>
          {activities.length === 0 && (
            <div className="text-sm text-erp-text3 py-4">Nog geen activiteiten.</div>
          )}
          {activities.map((a, i) => (
            <div key={a.id} className={`flex items-center gap-3 py-[9px] ${i < activities.length - 1 ? "border-b border-erp-border0" : ""}`}>
              <span className="text-base w-[26px] text-center">{activityIcon(a.activity_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-erp-text0 truncate">{a.subject}</div>
                <div className="text-[11px] text-erp-text3 mt-[1px]">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: nl })}
                </div>
              </div>
              <Chip>{a.activity_type}</Chip>
            </div>
          ))}
        </ErpCard>
      </div>

      <CreateActivityDialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen} />
    </div>
  );
}
