import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader, ErpCard, ErpButton, ErpTabs, Badge, Dot, Chip, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CreateActivityDialog from "@/components/erp/CreateActivityDialog";
import CommentsSection from "@/components/erp/CommentsSection";
import AiSummaryCard from "@/components/erp/AiSummaryCard";
import InlineEditField from "@/components/erp/InlineEditField";
import { projStatus } from "@/data/mockData";
import AiSidePanel from "@/components/erp/AiSidePanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgMembers } from "@/hooks/useTeam";

const statusOptions = Object.entries(projStatus).map(([k, [label]]) => ({ value: k, label }));
const priorityOptions = [
  { value: "low", label: "Laag" },
  { value: "medium", label: "Normaal" },
  { value: "high", label: "Hoog" },
  { value: "urgent", label: "Urgent" },
];
const billingOptions = [
  { value: "monthly", label: "Maandelijks" },
  { value: "quarterly", label: "Per kwartaal" },
  { value: "yearly", label: "Jaarlijks" },
];
const slaOptions = [
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
];
const serviceTypeOptions = [
  { value: "website", label: "Website" },
  { value: "webshop", label: "Webshop" },
  { value: "platform", label: "Platform" },
  { value: "maatwerk", label: "Maatwerk" },
  { value: "dashboard", label: "Dashboard" },
  { value: "saas", label: "SaaS" },
  { value: "intern", label: "Intern" },
  { value: "other", label: "Anders" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [activityOpen, setActivityOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const { data: membersData } = useOrgMembers();
  const members = membersData?.members ?? [];

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, companies(name, industry, city)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["project-timeline", id],
    enabled: !!id && tab === "timeline",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_project_timeline")
        .select("*")
        .eq("project_id", id!)
        .order("event_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["project-checklist", id],
    enabled: !!id && tab === "checklist",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_checklist_items")
        .select("*")
        .eq("project_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("project_checklist_items")
        .update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-checklist", id] }),
  });

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("project_checklist_items")
        .insert({
          project_id: id!,
          organization_id: orgId!,
          title,
          sort_order: checklist.length + 1,
          is_required: false,
          is_completed: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-checklist", id] });
      setNewItem("");
      toast.success("Item toegevoegd");
    },
  });

  const saveField = async (field: string, value: any) => {
    const { error } = await supabase.from("projects").update({ [field]: value }).eq("id", id!);
    if (error) { toast.error("Fout bij opslaan"); throw error; }
    qc.invalidateQueries({ queryKey: ["project-detail", id] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Opgeslagen");
  };

  if (isLoading) return <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>;
  if (!project) return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Project niet gevonden</ErpCard>;

  const [statusLabel, statusColor] = projStatus[project.status] || ["?", "#6b7280"];
  const completedCount = checklist.filter((c: any) => c.is_completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const sourceIcon = (source: string, eventType?: string) => {
    if (eventType === "email" || source === "email") return "📧";
    switch (source) {
      case "activity": return "📝"; case "status_update": return "📢"; case "invoice": return "💰";
      case "checklist": return "✓"; case "contract": return "📄"; default: return "⚡";
    }
  };

  const assignedMember = members.find(m => m.user_id === project.assigned_to);

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate("/projects")} className="text-erp-text3 hover:text-erp-text1 transition-colors">
          <Icons.ChevDown className="w-4 h-4 rotate-90" />
        </button>
        <span className="text-erp-text3 text-xs">Projecten</span>
      </div>

      <PageHeader title={project.name} desc={project.project_number}>
        <button
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aiPanelOpen ? "bg-erp-blue text-white" : "bg-erp-bg3 border border-erp-border0 text-erp-text1 hover:bg-erp-hover"}`}
        >
          ✨ AI {aiPanelOpen ? "Sluiten" : ""}
        </button>
        <ErpButton onClick={() => setActivityOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Activiteit
        </ErpButton>
      </PageHeader>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Quick status switcher */}
        <Select value={project.status} onValueChange={(v) => saveField("status", v)}>
          <SelectTrigger className="h-auto px-0 py-0 bg-transparent border-none w-auto min-w-0 focus:ring-0 focus:ring-offset-0 gap-0">
            <Badge color={statusColor}><Dot color={statusColor} size={5} />{statusLabel}</Badge>
          </SelectTrigger>
          <SelectContent className="bg-erp-bg3 border-erp-border0">
            {statusOptions.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-erp-text0 text-[13px] focus:bg-erp-hover">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {project.priority && <Chip>{priorityOptions.find(o => o.value === project.priority)?.label ?? project.priority}</Chip>}
        {project.companies?.name && <Chip>{project.companies.name}</Chip>}
        {assignedMember && (
          <Chip>👤 {assignedMember.profiles?.full_name ?? assignedMember.profiles?.email ?? "—"}</Chip>
        )}
      </div>

      <ErpTabs
        items={[["overview", "Overzicht"], ["timeline", "Timeline"], ["checklist", "Checklist"], ["comments", "Comments"]]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div className="space-y-5">
          <AiSummaryCard entityType="project" entityId={id!} />
          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-4">Details</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Status</div>
                <InlineEditField value={project.status} field="status" type="select" options={statusOptions} onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Prioriteit</div>
                <InlineEditField value={project.priority} field="priority" type="select" options={priorityOptions} onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Geschatte waarde</div>
                <InlineEditField value={project.estimated_value} field="estimated_value" type="number" prefix="€" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Werkelijke waarde</div>
                <InlineEditField value={project.actual_value} field="actual_value" type="number" prefix="€" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">MRR</div>
                <InlineEditField value={project.monthly_amount} field="monthly_amount" type="number" prefix="€" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Facturatie</div>
                <InlineEditField value={project.billing_frequency} field="billing_frequency" type="select" options={billingOptions} onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Contract start</div>
                <InlineEditField value={project.contract_start} field="contract_start" type="date" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Contract einde</div>
                <InlineEditField value={project.contract_end} field="contract_end" type="date" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Opzegtermijn</div>
                <InlineEditField value={project.notice_period_days} field="notice_period_days" type="number" suffix=" dagen" onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">SLA</div>
                <InlineEditField value={project.sla_level} field="sla_level" type="select" options={slaOptions} onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Service type</div>
                <InlineEditField value={project.service_type} field="service_type" type="select" options={serviceTypeOptions} onSave={saveField} />
              </div>
              <div className="group">
                <div className="text-[11px] text-erp-text3 mb-1">Toegewezen aan</div>
                <InlineEditField
                  value={project.assigned_to}
                  field="assigned_to"
                  type="select"
                  options={members.map(m => ({
                    value: m.user_id,
                    label: m.profiles?.full_name ?? m.profiles?.email ?? "—",
                  }))}
                  onSave={saveField}
                />
              </div>
              <div className="group col-span-3">
                <div className="text-[11px] text-erp-text3 mb-1">Preview URL</div>
                <InlineEditField value={project.preview_url} field="preview_url" type="url" onSave={saveField} />
              </div>
            </div>
          </ErpCard>

          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-2">Notities</div>
            <InlineEditField value={project.notes} field="notes" type="textarea" placeholder="Klik om notities toe te voegen..." onSave={saveField} />
          </ErpCard>
        </div>
      )}

      {tab === "timeline" && (
        <ErpCard className="p-5">
          {timeline.length === 0 && <div className="text-sm text-erp-text3 py-4">Geen events gevonden</div>}
          <div className="space-y-0">
            {timeline.map((ev: any, i: number) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-base w-7 h-7 flex items-center justify-center">{sourceIcon(ev.source, ev.event_type)}</span>
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-erp-border0 my-1" />}
                </div>
                <div className="pb-5 flex-1 min-w-0">
                  <div className="text-[13px] text-erp-text0 font-medium">{ev.title}</div>
                  {ev.event_type === "email" && ev.metadata?.from && (
                    <div className="text-[11px] text-erp-text3 mt-0.5">
                      Van: {(ev.metadata as any).from} → {(ev.metadata as any).to || "—"}
                    </div>
                  )}
                  {ev.description && <div className="text-[12px] text-erp-text2 mt-0.5 truncate">{ev.description}</div>}
                  <div className="text-[11px] text-erp-text3 mt-1">
                    {formatDistanceToNow(new Date(ev.event_at), { addSuffix: true, locale: nl })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ErpCard>
      )}

      {tab === "checklist" && (
        <div className="space-y-4">
          <ErpCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-erp-text2">{completedCount}/{totalCount} afgerond</span>
              <span className="text-xs font-semibold text-erp-text0">{progress}%</span>
            </div>
            <div className="h-[6px] bg-erp-bg4 rounded-sm overflow-hidden">
              <div className="h-full rounded-sm bg-erp-green transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </ErpCard>

          <ErpCard className="p-4">
            {checklist.length === 0 && <div className="text-sm text-erp-text3 py-4">Geen checklist items</div>}
            {checklist.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-erp-border0 last:border-none">
                <input
                  type="checkbox"
                  checked={item.is_completed}
                  onChange={() => toggleItem.mutate({ itemId: item.id, completed: !item.is_completed })}
                  className="w-4 h-4 rounded border-erp-border1 accent-erp-blue cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] ${item.is_completed ? "text-erp-text3 line-through" : "text-erp-text0"}`}>
                    {item.title}
                  </span>
                </div>
                {item.is_required && <Badge color="#f59e0b">Verplicht</Badge>}
                {item.due_date && (
                  <span className="text-[11px] text-erp-text3">{format(new Date(item.due_date), "d MMM")}</span>
                )}
              </div>
            ))}

            <form
              onSubmit={e => { e.preventDefault(); if (newItem.trim()) addItem.mutate(newItem.trim()); }}
              className="flex gap-2 mt-3 pt-3 border-t border-erp-border0"
            >
              <Input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                placeholder="Nieuw item toevoegen..."
                className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm flex-1"
              />
              <ErpButton primary disabled={!newItem.trim()}>
                <Icons.Plus className="w-3.5 h-3.5" />
              </ErpButton>
            </form>
          </ErpCard>
        </div>
      )}

      {tab === "comments" && (
        <CommentsSection entityType="project" entityId={id!} />
      )}

      <CreateActivityDialog open={activityOpen} onOpenChange={setActivityOpen} defaultProjectId={id} />
    </div>
  );
}
