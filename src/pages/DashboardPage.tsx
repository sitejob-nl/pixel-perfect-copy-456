import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard, ErpCard, Dot, Chip, PageHeader, ErpButton, Badge, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import CreateActivityDialog from "@/components/erp/CreateActivityDialog";
import { AlertTriangle, Lightbulb, Bell, TrendingUp, Sparkles, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const EXCLUDED_KEYWORDS = ['Web', 'Agency', 'Media', 'Brendly', 'Rickid', 'Savvy', 'Yellow', 'Fluencer', 'Lefhebbers', 'Marsmedia'];

function isExcluded(name: string) {
  const lower = name.toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

const healthColors: Record<string, string> = {
  green: "#22c55e", orange: "#f59e0b", red: "#ef4444", unknown: "#6b7280",
};

export default function DashboardPage() {
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const { data: org } = useOrganization();
  const { session } = useAuth();
  const orgId = org?.organization_id;
  const navigate = useNavigate();

  const { data: dealStats } = useQuery({
    queryKey: ["dashboard-deals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("value, stage_id, pipeline_stages(name, color, is_won, is_lost, sort_order)");
      if (error) throw error;
      return data;
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["dashboard-mrr", orgId],
    enabled: !!orgId,
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
    queryKey: ["dashboard-hot-count", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("temperature", "hot");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: activeProjectCount } = useQuery({
    queryKey: ["dashboard-active-projects", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["dashboard-activities", orgId],
    enabled: !!orgId,
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

  const { data: companyHealth = [] } = useQuery({
    queryKey: ["dashboard-company-health", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_company_health")
        .select("*")
        .order("days_since_activity", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: overdueItems = [] } = useQuery({
    queryKey: ["dashboard-overdue", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_get_overdue_items", { p_org_id: orgId! });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const openDeals = dealStats?.filter(d => {
    const stage = d.pipeline_stages as any;
    return stage && !stage.is_won && !stage.is_lost;
  }) ?? [];
  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const mrr = subscriptions?.reduce((sum, s) => sum + (s.monthly_amount ?? 0), 0) ?? 0;

  const stageMap = new Map<string, { name: string; color: string; count: number; total: number; sort: number }>();
  openDeals.forEach(d => {
    const stage = d.pipeline_stages as any;
    if (!stage) return;
    const key = stage.name;
    const existing = stageMap.get(key);
    if (existing) { existing.count++; existing.total += d.value ?? 0; }
    else stageMap.set(key, { name: stage.name, color: stage.color ?? "#6b7280", count: 1, total: d.value ?? 0, sort: stage.sort_order ?? 0 });
  });
  const stages = Array.from(stageMap.values()).sort((a, b) => a.sort - b.sort);
  const maxTotal = Math.max(...stages.map(s => s.total), 1);

  const filteredHealth = companyHealth.filter(c => !isExcluded(c.name)).slice(0, 8);

  const activityIcon = (type: string) => {
    switch (type) {
      case "call": return "📞"; case "email": return "📧"; case "meeting": return "🤝";
      case "note": return "📝"; case "task": return "✅"; default: return "⚡";
    }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Dashboard" desc="Hier is je overzicht voor vandaag.">
        <ErpButton><Icons.Calendar className="w-4 h-4" /> Deze maand <Icons.ChevDown className="w-3 h-3" /></ErpButton>
      </PageHeader>

      <div className="grid grid-cols-5 gap-[14px] mb-6">
        <StatCard label="Pipeline waarde" value={pipelineValue >= 1000 ? `${(pipelineValue / 1000).toFixed(1)}K` : String(pipelineValue)} prefix="€" change={`${openDeals.length} open deals`} up />
        <StatCard label="Open deals" value={String(openDeals.length)} change="actief in pipeline" up />
        <StatCard label="MRR" value={mrr >= 1000 ? `${(mrr / 1000).toFixed(1)}K` : String(mrr)} prefix="€" change="maandelijkse omzet" up />
        <StatCard label="Hot leads" value={String(hotCount ?? 0)} change="hoge temperatuur" up />
        <StatCard label="Actieve projecten" value={String(activeProjectCount ?? 0)} change="in ontwikkeling" up />
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-[14px] mb-6">
        <ErpCard className="p-5">
          <div className="text-[15px] font-semibold mb-4">Pipeline verdeling</div>
          {stages.length === 0 && <div className="text-sm text-erp-text3 py-4">Nog geen deals in de pipeline.</div>}
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
          {activities.length === 0 && <div className="text-sm text-erp-text3 py-4">Nog geen activiteiten.</div>}
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

      {/* Company Health + Overdue */}
      <div className="grid grid-cols-[3fr_2fr] gap-[14px] mb-6">
        <ErpCard className="overflow-hidden">
          <div className="px-5 pt-4 pb-2 text-[15px] font-semibold">Klant gezondheid</div>
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>Bedrijf</TH><TH>Status</TH><TH>Dagen</TH><TH>Projecten</TH><TH>MRR</TH></tr>
            </thead>
            <tbody>
              {filteredHealth.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-erp-text3 text-sm border-b border-erp-border0">Geen klantdata</td></tr>
              )}
              {filteredHealth.map(c => (
                <TR key={c.id}>
                  <TD><span className="text-erp-text0 font-medium text-[13px]">{c.name}</span></TD>
                  <TD><Dot color={healthColors[c.health_status] ?? healthColors.unknown} size={8} /></TD>
                  <TD><span className="text-erp-text2 text-xs">{c.days_since_activity != null ? `${c.days_since_activity}d` : "—"}</span></TD>
                  <TD><span className="text-erp-text1 text-xs">{c.active_projects ?? 0}</span></TD>
                  <TD><span className="text-erp-text0 text-xs font-medium">{c.total_mrr ? `€${fmt(Number(c.total_mrr))}` : "—"}</span></TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>

        <ErpCard className="p-5">
          <div className="text-[15px] font-semibold mb-3">Overdue taken</div>
          {overdueItems.length === 0 && <div className="text-sm text-erp-text3 py-4">Geen overdue items 🎉</div>}
          {overdueItems.map((item: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 py-[9px] ${i < overdueItems.length - 1 ? "border-b border-erp-border0" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-erp-text0 truncate">{item.item_title}</div>
                <div className="text-[11px] text-erp-text3 mt-[1px]">{item.project_name}</div>
              </div>
              <Badge color="#ef4444">{item.days_overdue}d overdue</Badge>
            </div>
          ))}
        </ErpCard>
      </div>

      {/* AI Widgets Row */}
      <AiWidgetsRow orgId={orgId} accessToken={session?.access_token} navigate={navigate} />

      <CreateActivityDialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen} />
    </div>
  );
}

const typeIcons: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="w-3.5 h-3.5 text-erp-amber" />,
  opportunity: <Lightbulb className="w-3.5 h-3.5 text-erp-green" />,
  reminder: <Bell className="w-3.5 h-3.5 text-erp-blue" />,
  insight: <TrendingUp className="w-3.5 h-3.5 text-erp-purple" />,
};

const priorityBorder: Record<string, string> = {
  high: "border-l-red-500", medium: "border-l-amber-500", low: "border-l-green-500",
};

function AiWidgetsRow({ orgId, accessToken, navigate }: { orgId?: string; accessToken?: string; navigate: any }) {
  const { data: suggestions, isLoading: sugLoading } = useQuery({
    queryKey: ["ai-dashboard-suggestions", orgId],
    enabled: !!orgId && !!accessToken,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-sitejob`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "suggest_actions", org_id: orgId }),
      });
      if (!res.ok) return { suggestions: [] };
      return await res.json();
    },
  });

  const { data: digest, isLoading: digLoading } = useQuery({
    queryKey: ["ai-smart-digest", orgId],
    enabled: !!orgId && !!accessToken,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-sitejob`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "smart_digest", org_id: orgId }),
      });
      if (!res.ok) return {};
      return await res.json();
    },
  });

  const digestItems = digest ? [
    { label: "Rode klanten", count: digest.rode_klanten ?? 0, color: "#ef4444", link: "/companies" },
    { label: "Overdue taken", count: digest.overdue_taken ?? 0, color: "#f59e0b", link: "/tasks" },
    { label: "Open facturen", count: digest.open_facturen ?? 0, color: "#f59e0b", link: "/invoices" },
    { label: "Deals in pipeline", count: digest.deals_in_pipeline ?? 0, color: "#3b82f6", link: "/pipeline" },
    { label: "Boekingen vandaag", count: digest.boekingen_vandaag ?? 0, color: "#22c55e", link: "/bookings" },
    { label: "Gemiste gesprekken", count: digest.gemiste_gesprekken ?? 0, color: "#ef4444", link: "/calls" },
  ] : [];

  return (
    <div className="grid grid-cols-[3fr_2fr] gap-[14px] mb-6">
      {/* AI Suggestions */}
      <ErpCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-erp-amber" />
          <span className="text-[15px] font-semibold">AI Suggesties</span>
        </div>
        {sugLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full bg-erp-bg3" />
            <Skeleton className="h-14 w-full bg-erp-bg3" />
            <Skeleton className="h-14 w-full bg-erp-bg3" />
          </div>
        ) : (
          <div className="space-y-2">
            {(suggestions?.suggestions || []).slice(0, 4).map((s: any, i: number) => (
              <div key={i} className={`border-l-2 ${priorityBorder[s.priority] || "border-l-gray-500"} bg-erp-bg3 rounded-r-lg p-3 cursor-pointer hover:bg-erp-hover transition-colors`}
                onClick={() => s.action_url && navigate(s.action_url)}>
                <div className="flex items-start gap-2">
                  {typeIcons[s.type] || typeIcons.insight}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-erp-text0">{s.title}</p>
                    <p className="text-[11px] text-erp-text2 mt-0.5">{s.description}</p>
                  </div>
                </div>
              </div>
            ))}
            {(!suggestions?.suggestions || suggestions.suggestions.length === 0) && (
              <p className="text-[13px] text-erp-text3 py-4 text-center">Geen suggesties beschikbaar</p>
            )}
          </div>
        )}
      </ErpCard>

      {/* Smart Digest */}
      <ErpCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-erp-amber" />
          <span className="text-[15px] font-semibold">Smart Overzicht</span>
        </div>
        {digLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full bg-erp-bg3" />)}
          </div>
        ) : (
          <div className="space-y-1">
            {digestItems.map((item, i) => (
              <div
                key={i}
                onClick={() => navigate(item.link)}
                className="flex items-center gap-3 py-2.5 px-2 rounded-lg cursor-pointer hover:bg-erp-hover transition-colors"
              >
                <Dot color={item.count > 0 ? item.color : "#6b7280"} size={8} />
                <span className="flex-1 text-[13px] text-erp-text1">{item.label}</span>
                <span className={`text-[14px] font-semibold ${item.count > 0 ? "text-erp-text0" : "text-erp-text3"}`}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </ErpCard>
    </div>
  );
}
