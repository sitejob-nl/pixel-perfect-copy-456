import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { ErpCard, ErpButton, ErpTabs, Badge, Dot, Chip, Avatar, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import InlineEditField from "@/components/erp/InlineEditField";
import QuickActionBar from "@/components/shared/QuickActionBar";
import CommunicationTimeline from "@/components/shared/CommunicationTimeline";
import AddTaskDialog from "@/components/shared/AddTaskDialog";
import EntityAttachments from "@/components/shared/EntityAttachments";
import { useActivities, useCreateActivity } from "@/hooks/useActivities";
import { stageColors, stageLabels, tierColors } from "@/data/mockData";
import type { ContactWithCompany } from "@/hooks/useContacts";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ContactWhatsAppTab from "@/components/whatsapp/ContactWhatsAppTab";

const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task"];
const activityIcon = (type: string) => ({ call: "📞", email: "📧", meeting: "🤝", note: "📝", task: "⚡" }[type] ?? "⚡");

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const [tab, setTab] = useState("activities");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [actDialogOpen, setActDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [actType, setActType] = useState("note");
  const [actSubject, setActSubject] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actOutcome, setActOutcome] = useState("");

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies:companies!contacts_company_id_fkey(id, name, industry, city)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as ContactWithCompany & { companies: { id: string; name: string; industry: string | null; city: string | null } | null };
    },
  });

  const { data: activities = [] } = useActivities({ contactId: id!, limit: 30 });
  const createActivity = useCreateActivity();

  const { data: deals = [] } = useQuery({
    queryKey: ["contact-deals", id],
    enabled: !!id && tab === "deals",
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, pipeline_stages(name, color)").eq("contact_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["contact-notes", id],
    enabled: !!id && tab === "notes",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_notes")
        .select("id, content, created_at, user_id, profiles:user_id(full_name, email)")
        .eq("contact_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["contact-tasks", id],
    enabled: !!id && tab === "tasks",
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("contact_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !org) throw new Error("Niet ingelogd");
      const { error } = await supabase.from("contact_notes").insert({
        contact_id: id!, organization_id: org.organization_id, user_id: user.id, content,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contact-notes", id] }); setNoteText(""); toast.success("Notitie toegevoegd"); },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("contact_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contact-notes", id] }); toast.success("Verwijderd"); },
  });

  const saveField = async (field: string, value: any) => {
    const { error } = await supabase.from("contacts").update({ [field]: value }).eq("id", id!);
    if (error) { toast.error("Fout"); throw error; }
    qc.invalidateQueries({ queryKey: ["contact", id] });
    qc.invalidateQueries({ queryKey: ["contacts"] });
    toast.success("Opgeslagen");
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.organization_id || !actSubject.trim()) return;
    await createActivity.mutateAsync({
      organization_id: org.organization_id, user_id: user?.id ?? null,
      contact_id: id!, company_id: contact?.company_id ?? null,
      activity_type: actType, subject: actSubject.trim(),
      description: actDesc || null, outcome: actOutcome || null, status: "completed",
    });
    toast.success("Activiteit gelogd");
    setActDialogOpen(false); setActSubject(""); setActDesc(""); setActOutcome("");
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const updates = completed
      ? { status: "completed" as const, completed_at: new Date().toISOString(), completed_by: user?.id }
      : { status: "todo" as const, completed_at: null, completed_by: null };
    await supabase.from("tasks").update(updates).eq("id", taskId);
    qc.invalidateQueries({ queryKey: ["contact-tasks", id] });
  };

  if (isLoading) return <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>;
  if (!contact) return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Contact niet gevonden</ErpCard>;

  const tier = contact.temperature ?? "warm";
  const stage = contact.lifecycle_stage ?? "lead";
  const inputClass = "w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors";

  return (
    <div className="animate-fade-up max-w-[1000px]">
      {/* Breadcrumb */}
      <button onClick={() => navigate("/contacts")} className="text-xs text-erp-text3 hover:text-erp-text1 mb-2 flex items-center gap-1 transition-colors">
        <Icons.ChevDown className="w-3.5 h-3.5 rotate-90" /> Contacten
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-3">
        <Avatar name={`${contact.first_name} ${contact.last_name ?? ""}`} id={contact.id.charCodeAt(0)} size={48} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-erp-text0">{contact.first_name} {contact.last_name}</h1>
          <div className="text-sm text-erp-text2 mt-0.5">
            {contact.job_title && <span>{contact.job_title}</span>}
            {contact.companies?.name && (
              <span> @ <button onClick={() => navigate(`/companies/${contact.companies!.id}`)} className="text-erp-blue hover:underline">{contact.companies.name}</button></span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge color={stageColors[stage] ?? "#6b7280"}><Dot color={stageColors[stage] ?? "#6b7280"} size={5} />{stageLabels[stage] ?? stage}</Badge>
          {contact.lead_status && <Chip>{contact.lead_status}</Chip>}
          <Badge color={tierColors[tier] ?? "#6b7280"}>{tier} · {contact.lead_score ?? 0}</Badge>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <QuickActionBar
          phone={contact.phone}
          mobile={contact.mobile}
          email={contact.email}
          linkedinUrl={contact.linkedin_url}
        />
      </div>

      {/* Info section */}
      <ErpCard className="p-5 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><div className="text-[11px] text-erp-text3 mb-1">Email</div><InlineEditField value={contact.email} field="email" onSave={saveField} /></div>
          <div><div className="text-[11px] text-erp-text3 mb-1">Telefoon</div><InlineEditField value={contact.phone} field="phone" onSave={saveField} /></div>
          <div><div className="text-[11px] text-erp-text3 mb-1">Mobiel</div><InlineEditField value={contact.mobile} field="mobile" onSave={saveField} /></div>
          <div><div className="text-[11px] text-erp-text3 mb-1">LinkedIn</div><InlineEditField value={contact.linkedin_url} field="linkedin_url" type="url" onSave={saveField} /></div>
          <div><div className="text-[11px] text-erp-text3 mb-1">Functie</div><InlineEditField value={contact.job_title} field="job_title" onSave={saveField} /></div>
          <div><div className="text-[11px] text-erp-text3 mb-1">Bron</div><InlineEditField value={contact.source} field="source" onSave={saveField} /></div>
          <div><div className="text-[11px] text-erp-text3 mb-1">Klant sinds</div><InlineEditField value={contact.customer_since} field="customer_since" type="date" onSave={saveField} /></div>
          <div><div className="text-[11px] text-erp-text3 mb-1">Volgende follow-up</div><InlineEditField value={contact.next_follow_up_at} field="next_follow_up_at" type="date" onSave={saveField} /></div>
        </div>
      </ErpCard>

      {/* Tabs */}
      <ErpTabs
        items={[
          ["activities", "Activiteiten"],
          ["communication", "Communicatie"],
          ["deals", "Deals"],
          ["notes", "Notities"],
          ["tasks", "Taken"],
          ["files", "Bestanden"],
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* === TAB: Activiteiten === */}
      {tab === "activities" && (
        <div className="space-y-3">
          <ErpButton onClick={() => setActDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Activiteit toevoegen
          </ErpButton>
          {activities.length === 0 && <p className="text-sm text-erp-text3 py-4">Nog geen activiteiten</p>}
          <div className="space-y-0">
            {activities.map((a, i) => (
              <div key={a.id} className={`flex gap-3 py-3 ${i < activities.length - 1 ? "border-b border-erp-border0" : ""}`}>
                <span className="text-base pt-0.5">{activityIcon(a.activity_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-erp-text0">{a.subject}</div>
                  {a.description && <div className="text-xs text-erp-text2 mt-0.5 truncate">{a.description}</div>}
                  {a.outcome && <div className="text-xs text-erp-green mt-0.5">Uitkomst: {a.outcome}</div>}
                  <div className="text-[10px] text-erp-text3 mt-1">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: nl })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === TAB: Communicatie === */}
      {tab === "communication" && <CommunicationTimeline contactId={id} />}

      {/* === TAB: Deals === */}
      {tab === "deals" && (
        <div className="space-y-2">
          {deals.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen deals</p>}
          {deals.map((d: any) => (
            <ErpCard key={d.id} className="p-4 flex items-center justify-between" hover onClick={() => navigate("/deals")}>
              <div>
                <div className="text-[13px] font-semibold text-erp-text0">{d.title}</div>
                {d.pipeline_stages && <Badge color={d.pipeline_stages.color ?? "#6b7280"}><Dot color={d.pipeline_stages.color ?? "#6b7280"} size={5} />{d.pipeline_stages.name}</Badge>}
              </div>
              <span className="text-sm font-bold text-erp-text0">€{fmt(Number(d.value ?? 0))}</span>
            </ErpCard>
          ))}
        </div>
      )}

      {/* === TAB: Notities === */}
      {tab === "notes" && (
        <div className="space-y-3">
          <div>
            <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Schrijf een notitie..." className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm min-h-[60px]" />
            <div className="flex justify-end mt-2">
              <ErpButton primary onClick={() => noteText.trim() && addNote.mutate(noteText.trim())} disabled={!noteText.trim()}>
                Notitie toevoegen
              </ErpButton>
            </div>
          </div>
          {notes.length === 0 && <p className="text-sm text-erp-text3">Nog geen notities</p>}
          {notes.map((n: any) => (
            <div key={n.id} className="bg-erp-bg3 rounded-lg p-3 border border-erp-border0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Avatar name={n.profiles?.full_name ?? "?"} id={n.user_id?.charCodeAt(0) ?? 0} size={20} />
                  <span className="text-xs font-medium text-erp-text0">{n.profiles?.full_name ?? n.profiles?.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-erp-text3">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: nl })}</span>
                  {n.user_id === user?.id && (
                    <button onClick={() => deleteNote.mutate(n.id)} className="text-erp-text3 hover:text-erp-red transition-colors">
                      <Icons.Trash className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm text-erp-text1 whitespace-pre-wrap">{n.content}</div>
            </div>
          ))}
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
                <input type="checkbox" checked={t.status === "completed"} onChange={e => toggleTask(t.id, e.target.checked)} className="rounded border-erp-border1 accent-erp-blue" />
                <div className="flex-1 min-w-0">
                  <span className={cn("text-[13px]", t.status === "completed" ? "line-through text-erp-text3" : "text-erp-text0")}>{t.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("text-[10px] font-medium uppercase", t.priority === "high" ? "text-erp-red" : t.priority === "low" ? "text-erp-text3" : "text-erp-orange")}>{t.priority}</span>
                    {t.due_date && <span className="text-[10px] text-erp-text3">{format(new Date(t.due_date), "d MMM", { locale: nl })}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <AddTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} contactId={id} />
        </div>
      )}

      {/* === TAB: Bestanden === */}
      {tab === "files" && (
        <EntityAttachments entityType="contact" entityId={id!} />
      )}

      {/* Add Activity Dialog */}
      <Dialog open={actDialogOpen} onOpenChange={setActDialogOpen}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-sm">
          <DialogHeader><DialogTitle className="text-erp-text0">Activiteit toevoegen</DialogTitle></DialogHeader>
          <form onSubmit={handleAddActivity} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Type</label>
              <Select value={actType} onValueChange={setActType}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t} className="text-erp-text0 text-sm focus:bg-erp-hover capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><label className="block text-xs font-medium text-erp-text1 mb-1">Onderwerp</label><input value={actSubject} onChange={e => setActSubject(e.target.value)} required className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-erp-text1 mb-1">Beschrijving</label><Textarea value={actDesc} onChange={e => setActDesc(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm" /></div>
            <div><label className="block text-xs font-medium text-erp-text1 mb-1">Uitkomst</label><input value={actOutcome} onChange={e => setActOutcome(e.target.value)} className={inputClass} /></div>
            <button type="submit" disabled={createActivity.isPending} className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50">
              {createActivity.isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
