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
import CreateContactDialog from "@/components/erp/CreateContactDialog";
import CreateDealDialog from "@/components/erp/CreateDealDialog";
import CreateProjectDialog from "@/components/erp/CreateProjectDialog";

const healthColors: Record<string, string> = {
  green: "#22c55e", orange: "#f59e0b", red: "#ef4444", unknown: "#6b7280",
};
const healthLabels: Record<string, string> = {
  green: "Gezond", orange: "Aandacht nodig", red: "Kritiek", unknown: "Onbekend",
};

export default function KlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
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

  const { data: contacts = [] } = useQuery({
    queryKey: ["company-contacts", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").eq("company_id", id!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["company-projects", id],
    enabled: !!id && (tab === "overview" || tab === "projects"),
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*, contacts(first_name, last_name)").eq("company_id", id!).order("created_at", { ascending: false });
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

  const { data: deals = [] } = useQuery({
    queryKey: ["company-deals", id],
    enabled: !!id && tab === "deals",
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, pipeline_stages(name, color)").eq("company_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveField = async (field: string, value: any) => {
    const { error } = await supabase.from("companies").update({ [field]: value }).eq("id", id!);
    if (error) { toast.error("Fout bij opslaan"); throw error; }
    qc.invalidateQueries({ queryKey: ["company-detail", id] });
    qc.invalidateQueries({ queryKey: ["companies"] });
    qc.invalidateQueries({ queryKey: ["klanten"] });
    toast.success("Opgeslagen");
  };

  const setPrimaryContact = async (contactId: string) => {
    const { error } = await supabase.from("companies").update({ primary_contact_id: contactId }).eq("id", id!);
    if (error) { toast.error("Fout"); return; }
    qc.invalidateQueries({ queryKey: ["company-detail", id] });
    toast.success("Primair contact gewijzigd");
  };

  if (isLoading) return <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>;
  if (!company) return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Klant niet gevonden</ErpCard>;

  const hs = health?.health_status || "unknown";
  const primaryContact = contacts.find((c: any) => c.id === company.primary_contact_id);

  const tempColors: Record<string, string> = { hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6" };

  return (
    <div className="flex gap-4">
      <div className="animate-fade-up max-w-[1200px] flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate("/klanten")} className="text-erp-text3 hover:text-erp-text1 transition-colors">
            <Icons.ChevDown className="w-4 h-4 rotate-90" />
          </button>
          <span className="text-erp-text3 text-xs">Klanten</span>
        </div>

        <PageHeader title={company.name} desc={primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name ?? ""} · ${primaryContact.email ?? ""}` : company.industry || undefined}>
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

        <ErpTabs
          items={[["overview", "Overzicht"], ["contacts", "Contactpersonen"], ["projects", "Projecten"], ["timeline", "Timeline"], ["deals", "Deals"], ["invoices", "Facturen"]]}
          active={tab}
          onChange={setTab}
        />

        {tab === "overview" && (
          <div className="space-y-5">
            <AiSummaryCard entityType="company" entityId={id!} />

            {/* Stats row */}
            <div className="grid grid-cols-6 gap-3">
              {[
                ["MRR", health?.total_mrr > 0 ? `€${fmt(Number(health.total_mrr))}` : "—"],
                ["Projecten", String(health?.active_projects ?? 0)],
                ["Open deals", String(deals.length || "—")],
                ["Dagen stil", health?.days_since_activity != null ? `${health.days_since_activity}d` : "—"],
                ["Emails 30d", String(health?.emails_30d ?? 0)],
                ["Calls 30d", String(health?.calls_30d ?? 0)],
              ].map(([label, val]) => (
                <ErpCard key={label} className="p-3 text-center">
                  <div className="text-[10px] text-erp-text3 mb-1">{label}</div>
                  <div className="text-[15px] font-bold text-erp-text0">{val}</div>
                </ErpCard>
              ))}
            </div>

            <ErpCard className="p-5">
              <div className="text-[14px] font-semibold mb-4">Bedrijfsgegevens</div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  ["Bedrijfsnaam", "name"], ["Branche", "industry"], ["Website", "website", "url"],
                  ["E-mail", "email"], ["Telefoon", "phone"], ["Stad", "city"],
                  ["Postcode", "postal_code"], ["Adres", "address_line1"], ["KVK-nummer", "kvk_number"],
                  ["BTW-nummer", "btw_number"], ["Rechtsvorm", "legal_form"], ["SBI-code", "sbi_code"],
                ].map(([label, field, type]) => (
                  <div key={field} className="group">
                    <div className="text-[11px] text-erp-text3 mb-1">{label}</div>
                    <InlineEditField value={(company as any)[field!]} field={field!} type={type as any} onSave={saveField} />
                  </div>
                ))}
              </div>
            </ErpCard>

            {primaryContact && (
              <ErpCard className="p-5">
                <div className="text-[14px] font-semibold mb-3">Primair contact</div>
                <div className="grid grid-cols-4 gap-4 text-[13px]">
                  <div><span className="text-erp-text3 text-[11px] block mb-1">Naam</span><span className="text-erp-text0">{primaryContact.first_name} {primaryContact.last_name ?? ""}</span></div>
                  <div><span className="text-erp-text3 text-[11px] block mb-1">E-mail</span><span className="text-erp-text0">{primaryContact.email ?? "—"}</span></div>
                  <div><span className="text-erp-text3 text-[11px] block mb-1">Telefoon</span><span className="text-erp-text0">{primaryContact.phone ?? "—"}</span></div>
                  <div><span className="text-erp-text3 text-[11px] block mb-1">Functie</span><span className="text-erp-text0">{primaryContact.job_title ?? "—"}</span></div>
                </div>
              </ErpCard>
            )}

            <ErpCard className="p-5">
              <div className="text-[14px] font-semibold mb-2">Notities</div>
              <InlineEditField value={company.notes} field="notes" type="textarea" placeholder="Klik om notities toe te voegen..." onSave={saveField} />
            </ErpCard>
          </div>
        )}

        {tab === "contacts" && (
          <div className="space-y-3">
            <div className="flex justify-end mb-2">
              <ErpButton primary onClick={() => setContactDialogOpen(true)}>
                <Icons.Plus className="w-3.5 h-3.5" /> Contactpersoon toevoegen
              </ErpButton>
            </div>
            {contacts.length === 0 && <ErpCard className="p-8 text-center text-erp-text3 text-sm">Geen contactpersonen</ErpCard>}
            {contacts.map((c: any) => {
              const isPrimary = c.id === company.primary_contact_id;
              return (
                <ErpCard key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isPrimary && <span title="Primair contact" className="text-erp-amber">⭐</span>}
                      <div>
                        <div className="text-[13px] font-medium text-erp-text0">
                          {c.first_name} {c.last_name ?? ""}
                          {c.job_title && <span className="text-erp-text3 font-normal ml-2">· {c.job_title}</span>}
                        </div>
                        <div className="text-[11px] text-erp-text3 mt-0.5">
                          {c.email ?? ""}{c.phone ? ` · ${c.phone}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.temperature && (
                        <Badge color={tempColors[c.temperature] ?? "#6b7280"}>{c.temperature}</Badge>
                      )}
                      {c.lead_score != null && (
                        <Chip>Score: {c.lead_score}</Chip>
                      )}
                      {!isPrimary && (
                        <button
                          onClick={() => setPrimaryContact(c.id)}
                          className="text-[11px] text-erp-text3 hover:text-erp-blue transition-colors bg-transparent border-none cursor-pointer"
                        >
                          Stel in als primair
                        </button>
                      )}
                    </div>
                  </div>
                </ErpCard>
              );
            })}
          </div>
        )}

        {tab === "projects" && (
          <div>
            <div className="flex justify-end mb-3">
              <ErpButton primary onClick={() => setProjectDialogOpen(true)}>
                <Icons.Plus className="w-3.5 h-3.5" /> Nieuw project
              </ErpButton>
            </div>
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
          </div>
        )}

        {tab === "timeline" && (
          <ErpCard className="p-5">
            {timeline.length === 0 && <div className="text-sm text-erp-text3 py-4">Geen activiteiten gevonden</div>}
            <div className="space-y-0">
              {timeline.map((ev: any, i: number) => {
                const icon = ev.activity_type === "email" ? "📧" : ev.activity_type === "call" ? "📞" : ev.activity_type === "meeting" ? "🤝" : ev.activity_type === "task" ? "✅" : "📝";
                return (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-base w-7 h-7 flex items-center justify-center">{icon}</span>
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-erp-border0 my-1" />}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <div className="text-[13px] text-erp-text0 font-medium">{ev.subject}</div>
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

        {tab === "deals" && (
          <div>
            <div className="flex justify-end mb-3">
              <ErpButton primary onClick={() => setDealDialogOpen(true)}>
                <Icons.Plus className="w-3.5 h-3.5" /> Nieuwe deal
              </ErpButton>
            </div>
            {deals.length === 0 && <ErpCard className="p-8 text-center text-erp-text3 text-sm">Geen deals</ErpCard>}
            {deals.map((d: any) => {
              const stage = d.pipeline_stages as any;
              return (
                <ErpCard key={d.id} className="p-4 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-erp-text0">{d.title}</div>
                      <div className="text-[11px] text-erp-text3 mt-0.5">
                        €{fmt(d.value ?? 0)} · {d.probability ?? 50}%
                        {d.expected_close && ` · Verwacht: ${format(new Date(d.expected_close), "d MMM yyyy", { locale: nl })}`}
                      </div>
                    </div>
                    {stage && <Badge color={stage.color ?? "#6b7280"}><Dot color={stage.color ?? "#6b7280"} size={5} />{stage.name}</Badge>}
                  </div>
                </ErpCard>
              );
            })}
          </div>
        )}

        {tab === "invoices" && (
          <ErpCard className="p-8 text-center text-erp-text3 text-sm">
            Nog geen facturen beschikbaar
          </ErpCard>
        )}

        <CreateContactDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />
        <CreateDealDialog open={dealDialogOpen} onOpenChange={setDealDialogOpen} />
        <CreateProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
      </div>
      {aiPanelOpen && orgId && <AiSidePanel entityType="company" entityId={id!} orgId={orgId} />}
    </div>
  );
}
