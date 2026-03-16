import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, ErpCard, ErpButton, ErpTabs, Badge, Dot, Chip, Avatar, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import InlineEditField from "@/components/erp/InlineEditField";
import QuickActionBar from "@/components/shared/QuickActionBar";
import CommunicationTimeline from "@/components/shared/CommunicationTimeline";
import AddTaskDialog from "@/components/shared/AddTaskDialog";
import CreateContactDialog from "@/components/erp/CreateContactDialog";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Star, AlertTriangle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { projStatus } from "@/data/mockData";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const { data: org } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
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

  const { data: deals = [] } = useQuery({
    queryKey: ["company-deals", id],
    enabled: !!id && tab === "deals",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, pipeline_stages(name, color), profiles(full_name)")
        .eq("company_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["company-projects", id],
    enabled: !!id && tab === "projects",
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["company-tasks", id],
    enabled: !!id && tab === "tasks",
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["company-contracts", id],
    enabled: !!id && tab === "documents",
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("company_id", id!).order("created_at", { ascending: false });
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

  const toggleTask = async (taskId: string, completed: boolean) => {
    const updates = completed
      ? { status: "done" as const, completed_at: new Date().toISOString(), completed_by: user?.id }
      : { status: "todo" as const, completed_at: null, completed_by: null };
    await supabase.from("tasks").update(updates).eq("id", taskId);
    qc.invalidateQueries({ queryKey: ["company-tasks", id] });
  };

  if (isLoading) return <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>;
  if (!company) return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Bedrijf niet gevonden</ErpCard>;

  const contactIds = contacts.map(c => c.id);
  const daysSinceActivity = company.last_activity_at ? Math.floor((Date.now() - new Date(company.last_activity_at).getTime()) / 86400000) : null;

  return (
    <div className="animate-fade-up max-w-[1200px]">
      {/* Breadcrumb */}
      <button onClick={() => navigate("/companies")} className="text-xs text-erp-text3 hover:text-erp-text1 mb-2 flex items-center gap-1 transition-colors">
        <Icons.ChevDown className="w-3.5 h-3.5 rotate-90" /> Bedrijven
      </button>

      {/* Header */}
      <h1 className="text-[22px] font-bold tracking-tight text-erp-text0 mb-2">{company.name}</h1>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {company.industry && <Chip>{company.industry}</Chip>}
        {company.company_size && <Chip>{company.company_size}</Chip>}
        {company.legal_form && <Chip>{company.legal_form}</Chip>}
        {company.google_rating && (
          <Chip>
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            {company.google_rating} ({company.google_review_count ?? 0})
          </Chip>
        )}
        {company.kvk_number && <Chip>KvK: {company.kvk_number}</Chip>}
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <QuickActionBar
          phone={company.phone}
          email={company.email}
          website={company.website}
          linkedinUrl={company.linkedin_url}
        />
      </div>

      <ErpTabs
        items={[
          ["overview", "Overzicht"],
          ["contacts", "Contactpersonen"],
          ["communication", "Communicatie"],
          ["deals", "Deals"],
          ["projects", "Projecten"],
          ["tasks", "Taken"],
          ["documents", "Documenten"],
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* === TAB: Overzicht === */}
      {tab === "overview" && (
        <div className="space-y-5">
          {daysSinceActivity !== null && daysSinceActivity > 30 && (
            <div className="bg-erp-red/10 border border-erp-red/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-erp-red flex-shrink-0" />
              <span className="text-sm text-erp-red font-medium">
                Geen activiteit sinds {format(new Date(company.last_activity_at!), "d MMMM yyyy", { locale: nl })}
              </span>
            </div>
          )}

          <ErpCard className="p-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <div className="text-[11px] text-erp-text3 mb-1">Adres</div>
                <InlineEditField value={company.address_line1} field="address_line1" onSave={saveField} placeholder="—" />
                <div className="text-xs text-erp-text2 mt-0.5">{[company.postal_code, company.city].filter(Boolean).join(" ")}</div>
              </div>
              <div>
                <div className="text-[11px] text-erp-text3 mb-1">SBI</div>
                <div className="text-[13px] text-erp-text0">{company.sbi_code ?? "—"}</div>
                {company.sbi_description && <div className="text-xs text-erp-text2">{company.sbi_description}</div>}
              </div>
              <div><div className="text-[11px] text-erp-text3 mb-1">Telefoon</div><InlineEditField value={company.phone} field="phone" onSave={saveField} /></div>
              <div><div className="text-[11px] text-erp-text3 mb-1">Oprichting</div><div className="text-[13px] text-erp-text0">{company.founding_date ?? "—"}</div></div>
              <div><div className="text-[11px] text-erp-text3 mb-1">Email</div><InlineEditField value={company.email} field="email" onSave={saveField} /></div>
              <div><div className="text-[11px] text-erp-text3 mb-1">Werknemers</div><div className="text-[13px] text-erp-text0">{company.employee_count_range ?? "—"}</div></div>
              <div><div className="text-[11px] text-erp-text3 mb-1">Website</div><InlineEditField value={company.website} field="website" type="url" onSave={saveField} /></div>
              <div><div className="text-[11px] text-erp-text3 mb-1">Jaaromzet</div><div className="text-[13px] text-erp-text0">{company.annual_revenue ?? "—"}</div></div>
              <div><div className="text-[11px] text-erp-text3 mb-1">KvK</div><div className="text-[13px] text-erp-text0">{company.kvk_number ?? "—"}</div></div>
              <div><div className="text-[11px] text-erp-text3 mb-1">BTW</div><div className="text-[13px] text-erp-text0">{company.btw_number ?? "—"}</div></div>
            </div>
          </ErpCard>

          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-2">Notities</div>
            <InlineEditField value={company.notes} field="notes" type="textarea" placeholder="Klik om notities toe te voegen..." onSave={saveField} />
          </ErpCard>
        </div>
      )}

      {/* === TAB: Contactpersonen === */}
      {tab === "contacts" && (
        <div className="space-y-3">
          <ErpButton onClick={() => setContactDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Contact toevoegen
          </ErpButton>

          {contacts.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen contactpersonen</p>}

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {contacts.map(c => {
              const isPrimary = c.id === company.primary_contact_id;
              return (
                <ErpCard key={c.id} className="p-4" hover onClick={() => navigate(`/contacts/${c.id}`)}>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${c.first_name} ${c.last_name ?? ""}`} id={c.id.charCodeAt(0)} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-erp-text0">{c.first_name} {c.last_name}</span>
                        {isPrimary && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      </div>
                      {c.job_title && <div className="text-xs text-erp-text2">{c.job_title}</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-erp-blue hover:underline">{c.email}</a>}
                    {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-erp-blue hover:underline">{c.phone}</a>}
                  </div>
                </ErpCard>
              );
            })}
          </div>
        </div>
      )}

      {/* === TAB: Communicatie === */}
      {tab === "communication" && (
        <CommunicationTimeline companyId={id} contactIds={contactIds} />
      )}

      {/* === TAB: Deals === */}
      {tab === "deals" && (
        <div className="space-y-3">
          <ErpButton onClick={() => navigate("/deals")}>
            <Plus className="w-3.5 h-3.5" /> Nieuwe deal
          </ErpButton>
          {deals.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen deals</p>}
          <div className="space-y-2">
            {deals.map((d: any) => (
              <ErpCard key={d.id} className="p-4 flex items-center justify-between" hover onClick={() => navigate("/deals")}>
                <div>
                  <div className="text-[13px] font-semibold text-erp-text0">{d.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {d.pipeline_stages && (
                      <Badge color={d.pipeline_stages.color ?? "#6b7280"}>
                        <Dot color={d.pipeline_stages.color ?? "#6b7280"} size={5} />
                        {d.pipeline_stages.name}
                      </Badge>
                    )}
                    {d.profiles?.full_name && <span className="text-xs text-erp-text3">{d.profiles.full_name}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-erp-text0">€{fmt(Number(d.value ?? 0))}</div>
                  {d.expected_close && <div className="text-[10px] text-erp-text3">{format(new Date(d.expected_close), "d MMM", { locale: nl })}</div>}
                </div>
              </ErpCard>
            ))}
          </div>
        </div>
      )}

      {/* === TAB: Projecten === */}
      {tab === "projects" && (
        <div className="space-y-3">
          <ErpButton onClick={() => navigate("/projects")}>
            <Plus className="w-3.5 h-3.5" /> Nieuw project
          </ErpButton>
          {projects.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen projecten</p>}
          <ErpCard className="overflow-hidden">
            <table className="w-full border-collapse">
              <thead><tr><TH>Project</TH><TH>Status</TH><TH>Type</TH><TH>MRR</TH><TH>Deadline</TH></tr></thead>
              <tbody>
                {projects.map((p: any) => {
                  const [label, color] = projStatus[p.status] || ["?", "#6b7280"];
                  return (
                    <TR key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                      <TD className="font-medium text-erp-text0">{p.name}</TD>
                      <TD><Badge color={color}><Dot color={color} size={5} />{label}</Badge></TD>
                      <TD className="text-erp-text2 text-xs">{p.service_type ?? "—"}</TD>
                      <TD className="text-erp-text0 text-xs">{p.monthly_amount ? `€${fmt(p.monthly_amount)}` : "—"}</TD>
                      <TD className="text-erp-text3 text-xs">{p.deadline ? format(new Date(p.deadline), "d MMM yyyy", { locale: nl }) : "—"}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
          </ErpCard>
        </div>
      )}

      {/* === TAB: Taken === */}
      {tab === "tasks" && (
        <div className="space-y-3">
          <ErpButton onClick={() => setTaskDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Nieuwe taak
          </ErpButton>
          {tasks.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen taken</p>}
          <div className="space-y-1">
            {tasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 bg-erp-bg3 rounded-lg p-2.5 border border-erp-border0">
                <input
                  type="checkbox"
                  checked={t.status === "done"}
                  onChange={e => toggleTask(t.id, e.target.checked)}
                  className="rounded border-erp-border1 accent-erp-blue"
                />
                <div className="flex-1 min-w-0">
                  <span className={cn("text-[13px]", t.status === "done" ? "line-through text-erp-text3" : "text-erp-text0")}>{t.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("text-[10px] font-medium uppercase", t.priority === "high" ? "text-erp-red" : t.priority === "low" ? "text-erp-text3" : "text-erp-orange")}>{t.priority}</span>
                    {t.due_date && <span className="text-[10px] text-erp-text3">{format(new Date(t.due_date), "d MMM", { locale: nl })}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <AddTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} companyId={id} />
        </div>
      )}

      {/* === TAB: Documenten === */}
      {tab === "documents" && (
        <div className="space-y-3">
          {contracts.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen documenten</p>}
          {contracts.map((c: any) => (
            <ErpCard key={c.id} className="p-4" hover>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-erp-text0">{c.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip>{c.type ?? "Contract"}</Chip>
                    <Badge color={c.status === "signed" ? "#22c55e" : "#6b7280"}>{c.status ?? "—"}</Badge>
                  </div>
                </div>
                <span className="text-xs text-erp-text3">{format(new Date(c.created_at), "d MMM yyyy", { locale: nl })}</span>
              </div>
            </ErpCard>
          ))}
        </div>
      )}

      <CreateContactDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />
    </div>
  );
}
