import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, ErpCard, ErpButton, ErpTabs, Badge, Dot, Chip, Avatar, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import CommentsSection from "@/components/erp/CommentsSection";
import AiSummaryCard from "@/components/erp/AiSummaryCard";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { projStatus } from "@/data/mockData";

const healthColors: Record<string, string> = {
  green: "#22c55e", orange: "#f59e0b", red: "#ef4444", unknown: "#6b7280",
};
const healthLabels: Record<string, string> = {
  green: "Gezond", orange: "Aandacht nodig", red: "Kritiek", unknown: "Onbekend",
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("projects");
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: health } = useQuery({
    queryKey: ["company-health", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_company_health")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) return null;
      return data as any;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["company-projects", id],
    enabled: !!id && tab === "projects",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["company-timeline", id],
    enabled: !!id && tab === "timeline",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("company_id", id!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>;
  if (!company) return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Bedrijf niet gevonden</ErpCard>;

  const hs = health?.health_status || "unknown";

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate("/companies")} className="text-erp-text3 hover:text-erp-text1 transition-colors">
          <Icons.ChevDown className="w-4 h-4 rotate-90" />
        </button>
        <span className="text-erp-text3 text-xs">Bedrijven</span>
      </div>

      <PageHeader title={company.name} desc={company.industry || undefined} />

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Badge color={healthColors[hs]}>
          <Dot color={healthColors[hs]} size={5} />
          {healthLabels[hs]}
          {health?.days_since_activity != null && ` (${health.days_since_activity}d)`}
        </Badge>
        {company.city && <Chip>{company.city}</Chip>}
        {company.kvk_number && <Chip>KVK: {company.kvk_number}</Chip>}
        {health?.total_mrr > 0 && <Chip>MRR: €{fmt(Number(health.total_mrr))}</Chip>}
        {company.website && (
          <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener" className="text-[11px] text-erp-blue hover:underline">
            {company.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>

      {/* AI Summary */}
      <AiSummaryCard entityType="company" entityId={id!} />

      <ErpTabs
        items={[["projects", "Projecten"], ["timeline", "Timeline"], ["comments", "Comments"]]}
        active={tab}
        onChange={setTab}
      />

      {tab === "projects" && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>Project</TH><TH>Status</TH><TH>MRR</TH><TH>Aangemaakt</TH></tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-erp-text3 text-sm border-b border-erp-border0">Geen projecten</td></tr>
              )}
              {projects.map((p: any) => {
                const [label, color] = projStatus[p.status] || ["?", "#6b7280"];
                return (
                  <TR key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                    <TD>
                      <div>
                        <div className="font-medium text-erp-text0">{p.name}</div>
                        <div className="text-[11px] text-erp-text3">{p.project_number}</div>
                      </div>
                    </TD>
                    <TD><Badge color={color}><Dot color={color} size={5} />{label}</Badge></TD>
                    <TD><span className="text-erp-text0 text-xs">{p.monthly_amount ? `€${fmt(p.monthly_amount)}` : "—"}</span></TD>
                    <TD><span className="text-erp-text3 text-xs">{format(new Date(p.created_at), "d MMM yyyy", { locale: nl })}</span></TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      {tab === "timeline" && (
        <ErpCard className="p-5">
          {timeline.length === 0 && <div className="text-sm text-erp-text3 py-4">Geen activiteiten gevonden</div>}
          <div className="space-y-0">
            {timeline.map((ev: any, i: number) => {
              const isEmail = ev.activity_type === "email";
              const meta = ev.metadata as any;
              return (
                <div key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-base w-7 h-7 flex items-center justify-center">
                      {isEmail ? "📧" : ev.activity_type === "call" ? "📞" : ev.activity_type === "meeting" ? "🤝" : "📝"}
                    </span>
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-erp-border0 my-1" />}
                  </div>
                  <div className="pb-5 flex-1 min-w-0">
                    <div className="text-[13px] text-erp-text0 font-medium">{ev.subject}</div>
                    {isEmail && meta?.from && (
                      <div className="text-[11px] text-erp-text3 mt-0.5">
                        Van: {meta.from} → {meta.to || "—"}
                      </div>
                    )}
                    {ev.description && <div className="text-[12px] text-erp-text2 mt-0.5 truncate">{ev.description}</div>}
                    <div className="text-[11px] text-erp-text3 mt-1">
                      {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: nl })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ErpCard>
      )}

      {tab === "comments" && (
        <CommentsSection entityType="company" entityId={id!} />
      )}
    </div>
  );
}
