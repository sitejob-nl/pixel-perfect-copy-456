import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader, ErpCard, ErpButton, ErpTabs, Badge, Dot, Chip, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import CommentsSection from "@/components/erp/CommentsSection";
import AiSummaryCard from "@/components/erp/AiSummaryCard";
import InlineEditField from "@/components/erp/InlineEditField";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { projStatus } from "@/data/mockData";
import { toast } from "sonner";
import AiSidePanel from "@/components/erp/AiSidePanel";

const healthColors: Record<string, string> = {
  green: "#22c55e", orange: "#f59e0b", red: "#ef4444", unknown: "#6b7280",
};
const healthLabels: Record<string, string> = {
  green: "Gezond", orange: "Aandacht nodig", red: "Kritiek", unknown: "Onbekend",
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: health } = useQuery({
    queryKey: ["company-health", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_company_health").select("*").eq("id", id!).single();
      if (error) return null;
      return data as any;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["company-projects", id],
    enabled: !!id && (tab === "overview" || tab === "projects"),
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["company-timeline", id],
    enabled: !!id && tab === "timeline",
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("company_id", id!).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveField = async (field: string, value: any) => {
    const { error } = await supabase.from("companies").update({ [field]: value }).eq("id", id!);
    if (error) { toast.error("Fout bij opslaan"); throw error; }
    qc.invalidateQueries({ queryKey: ["company-detail", id] });
    qc.invalidateQueries({ queryKey: ["companies"] });
    toast.success("Opgeslagen");
  };

  if (isLoading) return <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>;
  if (!company) return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Bedrijf niet gevonden</ErpCard>;

  const hs = health?.health_status || "unknown";

  return (
    <div className="flex gap-4">
    <div className="animate-fade-up max-w-[1200px] flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate("/klanten")} className="text-erp-text3 hover:text-erp-text1 transition-colors">
          <Icons.ChevDown className="w-4 h-4 rotate-90" />
        </button>
        <span className="text-erp-text3 text-xs">Klanten</span>
      </div>

      <PageHeader title={company.name} desc={company.industry || undefined}>
        <button
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aiPanelOpen ? "bg-erp-blue text-white" : "bg-erp-bg3 border border-erp-border0 text-erp-text1 hover:bg-erp-hover"}`}
        >
          ✨ AI {aiPanelOpen ? "Sluiten" : ""}
        </button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Badge color={healthColors[hs]}>
          <Dot color={healthColors[hs]} size={5} />
          {healthLabels[hs]}
          {health?.days_since_activity != null && ` (${health.days_since_activity}d)`}
        </Badge>
        {company.city && <Chip>{company.city}</Chip>}
        {company.kvk_number && <Chip>KVK: {company.kvk_number}</Chip>}
        {health?.total_mrr > 0 && <Chip>MRR: €{fmt(Number(health.total_mrr))}</Chip>}
      </div>

      <AiSummaryCard entityType="company" entityId={id!} />

      <ErpTabs
        items={[["overview", "Overzicht"], ["projects", "Projecten"], ["timeline", "Timeline"], ["comments", "Comments"]]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div className="space-y-5">
          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-4">Bedrijfsgegevens</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Bedrijfsnaam</div>
                <InlineEditField value={company.name} field="name" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Branche</div>
                <InlineEditField value={company.industry} field="industry" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Website</div>
                <InlineEditField value={company.website} field="website" type="url" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">E-mail</div>
                <InlineEditField value={company.email} field="email" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Telefoon</div>
                <InlineEditField value={company.phone} field="phone" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Stad</div>
                <InlineEditField value={company.city} field="city" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Postcode</div>
                <InlineEditField value={company.postal_code} field="postal_code" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Adres</div>
                <InlineEditField value={company.address_line1} field="address_line1" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">KVK-nummer</div>
                <InlineEditField value={company.kvk_number} field="kvk_number" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">BTW-nummer</div>
                <InlineEditField value={company.btw_number} field="btw_number" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Rechtsvorm</div>
                <InlineEditField value={company.legal_form} field="legal_form" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">SBI-code</div>
                <InlineEditField value={company.sbi_code} field="sbi_code" onSave={saveField} />
              </div>
            </div>
          </ErpCard>

          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-2">Notities</div>
            <InlineEditField value={company.notes} field="notes" type="textarea" placeholder="Klik om notities toe te voegen..." onSave={saveField} />
          </ErpCard>
        </div>
      )}

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
                      <div className="text-[11px] text-erp-text3 mt-0.5">Van: {meta.from} → {meta.to || "—"}</div>
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
    {aiPanelOpen && orgId && <AiSidePanel entityType="company" entityId={id!} orgId={orgId} />}
    </div>
  );
}
