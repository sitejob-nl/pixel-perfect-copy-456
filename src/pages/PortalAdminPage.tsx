import { useState, useRef, useEffect } from "react";
import { PageHeader, ErpButton, ErpCard, ErpTabs, Badge, Dot, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import {
  usePortalSessions,
  useCreatePortal,
  useOnboardingTemplates,
  useApplyOnboardingToPortal,
  usePortalOnboarding,
  usePortalFileRequests,
  useCreateFileRequest,
  usePortalMessages,
  useSendPortalMessage,
  useMarkMessagesRead,
  usePortalActivity,
} from "@/hooks/usePortalAdmin";
import { useOrganization } from "@/hooks/useOrganization";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useProjects } from "@/hooks/useProjects";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const ALL_SECTIONS = [
  { key: "overview", label: "Overzicht" },
  { key: "contracts", label: "Contracten" },
  { key: "invoices", label: "Facturen" },
  { key: "quotes", label: "Offertes" },
  { key: "files", label: "Bestanden" },
  { key: "onboarding", label: "Onboarding" },
  { key: "messages", label: "Berichten" },
];

export default function PortalAdminPage() {
  const [selectedPortal, setSelectedPortal] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return selectedPortal ? (
    <PortalDetail portal={selectedPortal} onBack={() => setSelectedPortal(null)} />
  ) : (
    <PortalList onSelect={setSelectedPortal} onCreateOpen={() => setCreateOpen(true)} createOpen={createOpen} setCreateOpen={setCreateOpen} />
  );
}

// ─── Portal List ───

function PortalList({ onSelect, onCreateOpen, createOpen, setCreateOpen }: {
  onSelect: (p: any) => void;
  onCreateOpen: () => void;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
}) {
  const { data: portals = [], isLoading } = usePortalSessions();

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Klantenportalen" desc={`${portals.length} portalen`}>
        <ErpButton primary onClick={onCreateOpen}>
          <Icons.Plus className="w-4 h-4" /> Nieuw portaal
        </ErpButton>
      </PageHeader>

      {isLoading ? (
        <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>
      ) : (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Klant</TH>
                <TH>Portaal naam</TH>
                <TH>Status</TH>
                <TH>Ongelezen</TH>
                <TH>Laatst bezocht</TH>
                <TH>Verloopt</TH>
              </tr>
            </thead>
            <tbody>
              {portals.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Nog geen portalen aangemaakt</td></tr>
              )}
              {portals.map((p: any) => {
                const contactName = p.contacts
                  ? `${p.contacts.first_name} ${p.contacts.last_name ?? ""}`.trim()
                  : p.client_name || "—";
                const companyName = p.companies?.name;
                const isActive = p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date());
                return (
                  <TR key={p.id} onClick={() => onSelect(p)}>
                    <TD>
                      <div className="font-medium text-erp-text0">{contactName}</div>
                      {companyName && <div className="text-[11px] text-erp-text3">{companyName}</div>}
                    </TD>
                    <TD className="text-erp-text1">{p.portal_name || "Portaal"}</TD>
                    <TD>
                      <Badge color={isActive ? "hsl(142,71%,45%)" : "hsl(0,84%,60%)"}>
                        <Dot color={isActive ? "hsl(142,71%,45%)" : "hsl(0,84%,60%)"} size={5} />
                        {isActive ? "Actief" : "Inactief"}
                      </Badge>
                    </TD>
                    <TD>
                      {p.unread_count > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-erp-blue text-white text-[11px] font-bold">
                          {p.unread_count}
                        </span>
                      ) : (
                        <span className="text-erp-text3 text-xs">0</span>
                      )}
                    </TD>
                    <TD className="text-erp-text2 text-xs">
                      {p.last_accessed_at ? format(new Date(p.last_accessed_at), "d MMM yyyy HH:mm", { locale: nl }) : "Nooit"}
                    </TD>
                    <TD className="text-erp-text2 text-xs">
                      {p.expires_at ? format(new Date(p.expires_at), "d MMM yyyy", { locale: nl }) : "—"}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      <CreatePortalDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ─── Create Portal Dialog ───

function CreatePortalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: org } = useOrganization();
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const createPortal = useCreatePortal();

  const [contactId, setContactId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [portalName, setPortalName] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [sections, setSections] = useState<string[]>(ALL_SECTIONS.map(s => s.key));

  const selectedContact = contacts.find((c: any) => c.id === contactId);
  const companyId = selectedContact?.company_id || null;

  const toggleSection = (key: string) => {
    setSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const handleSubmit = () => {
    if (!org?.organization_id) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    createPortal.mutate(
      {
        organization_id: org.organization_id,
        contact_id: contactId,
        company_id: companyId,
        project_id: projectId,
        portal_name: portalName.trim() || undefined,
        welcome_message: welcomeMsg.trim() || undefined,
        password_required: passwordProtect,
        enabled_sections: sections,
        expires_at: expiresAt.toISOString(),
      },
      {
        onSuccess: (data) => {
          toast.success("Portaal aangemaakt!");
          navigator.clipboard.writeText(`${window.location.origin}/portal?token=${data.access_token}`);
          toast.info("Portal link gekopieerd naar klembord");
          onOpenChange(false);
          // Reset
          setContactId(null);
          setProjectId(null);
          setPortalName("");
          setWelcomeMsg("");
          setPasswordProtect(false);
          setSections(ALL_SECTIONS.map(s => s.key));
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuw klantenportaal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Contact *</Label>
            <Select value={contactId ?? "none"} onValueChange={v => setContactId(v === "none" ? null : v)}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue placeholder="Selecteer contact" /></SelectTrigger>
              <SelectContent className="bg-erp-bg2 border-erp-border0">
                <SelectItem value="none">— Geen —</SelectItem>
                {contacts.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {companyId && selectedContact && (
            <div className="text-xs text-erp-text3">Bedrijf wordt automatisch gekoppeld</div>
          )}

          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Project (optioneel)</Label>
            <Select value={projectId ?? "none"} onValueChange={v => setProjectId(v === "none" ? null : v)}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-erp-bg2 border-erp-border0">
                <SelectItem value="none">— Geen —</SelectItem>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} — {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Portaal naam</Label>
            <Input
              value={portalName}
              onChange={e => setPortalName(e.target.value)}
              className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"
              placeholder="Bijv. Acme B.V. Portaal"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Welkomstbericht</Label>
            <textarea
              value={welcomeMsg}
              onChange={e => setWelcomeMsg(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border1 text-erp-text0 text-sm rounded-md px-3 py-2 resize-none h-20"
              placeholder="Welkom bij uw klantenportaal..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={passwordProtect}
              onCheckedChange={v => setPasswordProtect(v === true)}
              className="border-erp-border1"
            />
            <Label className="text-erp-text2 text-xs cursor-pointer" onClick={() => setPasswordProtect(!passwordProtect)}>
              Wachtwoord beveiliging
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-erp-text2 text-xs">Secties inschakelen</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SECTIONS.map(sec => (
                <div key={sec.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={sections.includes(sec.key)}
                    onCheckedChange={() => toggleSection(sec.key)}
                    className="border-erp-border1"
                  />
                  <span className="text-erp-text1 text-xs">{sec.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
            <ErpButton primary onClick={handleSubmit} disabled={createPortal.isPending}>
              {createPortal.isPending ? "Aanmaken..." : "Portaal aanmaken"}
            </ErpButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Portal Detail ───

function PortalDetail({ portal, onBack }: { portal: any; onBack: () => void }) {
  const [tab, setTab] = useState("overview");
  const { data: org } = useOrganization();
  const orgId = org?.organization_id || "";

  const contactName = portal.contacts
    ? `${portal.contacts.first_name} ${portal.contacts.last_name ?? ""}`.trim()
    : portal.client_name || "Onbekend";

  const portalUrl = `${window.location.origin}/portal?token=${portal.access_token}`;

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-erp-text3 hover:text-erp-text0 transition-colors">
          ← Terug
        </button>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold tracking-tight text-erp-text0">
            {portal.portal_name || contactName}
          </h1>
          <p className="text-[13px] text-erp-text2 mt-0.5">{contactName}{portal.companies?.name ? ` · ${portal.companies.name}` : ""}</p>
        </div>
      </div>

      <ErpTabs
        items={[
          ["overview", "Overzicht"],
          ["messages", "Berichten"],
          ["onboarding", "Onboarding"],
          ["files", "Bestanden"],
          ["activity", "Activiteit"],
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && <OverviewTab portal={portal} portalUrl={portalUrl} />}
      {tab === "messages" && <MessagesTab portalId={portal.id} orgId={orgId} />}
      {tab === "onboarding" && <OnboardingTab portalId={portal.id} orgId={orgId} />}
      {tab === "files" && <FilesTab portalId={portal.id} orgId={orgId} />}
      {tab === "activity" && <ActivityTab portalId={portal.id} />}
    </div>
  );
}

// ─── Overview Tab ───

function OverviewTab({ portal, portalUrl }: { portal: any; portalUrl: string }) {
  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    toast.success("Link gekopieerd!");
  };

  return (
    <ErpCard className="p-6 space-y-5">
      <div>
        <Label className="text-erp-text3 text-[10px] uppercase tracking-wider font-semibold">Portal link</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input value={portalUrl} readOnly className="bg-erp-bg3 border-erp-border1 text-erp-text1 text-xs font-mono flex-1" />
          <ErpButton primary onClick={copyLink}>Kopieer</ErpButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoRow label="Status" value={portal.is_active ? "Actief" : "Inactief"} />
        <InfoRow label="Wachtwoord" value={portal.password_required ? "Ja" : "Nee"} />
        <InfoRow label="Aangemaakt" value={portal.created_at ? format(new Date(portal.created_at), "d MMM yyyy", { locale: nl }) : "—"} />
        <InfoRow label="Verloopt" value={portal.expires_at ? format(new Date(portal.expires_at), "d MMM yyyy", { locale: nl }) : "—"} />
        <InfoRow label="Laatst bezocht" value={portal.last_accessed_at ? format(new Date(portal.last_accessed_at), "d MMM yyyy HH:mm", { locale: nl }) : "Nooit"} />
        <InfoRow label="Project" value={portal.projects?.name || "—"} />
      </div>

      {portal.welcome_message && (
        <div>
          <Label className="text-erp-text3 text-[10px] uppercase tracking-wider font-semibold">Welkomstbericht</Label>
          <p className="text-erp-text1 text-sm mt-1">{portal.welcome_message}</p>
        </div>
      )}
    </ErpCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-erp-text3 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-sm text-erp-text1 mt-0.5">{value}</div>
    </div>
  );
}

// ─── Messages Tab ───

function MessagesTab({ portalId, orgId }: { portalId: string; orgId: string }) {
  const { data: messages = [] } = usePortalMessages(portalId);
  const sendMsg = useSendPortalMessage();
  const markRead = useMarkMessagesRead();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead.mutate(portalId);
  }, [portalId, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMsg.mutate(
      { portalSessionId: portalId, organizationId: orgId, message: text.trim() },
      { onSuccess: () => setText("") }
    );
  };

  return (
    <ErpCard className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-erp-text3 text-sm text-center py-12">Nog geen berichten</div>
        )}
        {messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
              m.sender_type === "admin"
                ? "bg-erp-blue text-white"
                : "bg-erp-bg3 text-erp-text0"
            }`}>
              <div className="text-[10px] opacity-70 mb-0.5">{m.sender_name}</div>
              <div className="text-sm">{m.message}</div>
              <div className="text-[10px] opacity-50 mt-1">
                {format(new Date(m.created_at), "HH:mm", { locale: nl })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-erp-border0 p-3 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm flex-1"
          placeholder="Typ een bericht..."
        />
        <ErpButton primary onClick={handleSend} disabled={sendMsg.isPending || !text.trim()}>
          <Icons.Send className="w-4 h-4" />
        </ErpButton>
      </div>
    </ErpCard>
  );
}

// ─── Onboarding Tab ───

function OnboardingTab({ portalId, orgId }: { portalId: string; orgId: string }) {
  const { data: questions = [] } = usePortalOnboarding(portalId);
  const { data: templates = [] } = useOnboardingTemplates();
  const applyTemplate = useApplyOnboardingToPortal();
  const [templateId, setTemplateId] = useState<string | null>(null);

  const handleApply = () => {
    if (!templateId) return;
    applyTemplate.mutate(
      { portalSessionId: portalId, templateId, organizationId: orgId },
      {
        onSuccess: () => { toast.success("Onboarding vragen toegepast!"); setTemplateId(null); },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-4">
      <ErpCard className="p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-erp-text2 text-xs">Template toepassen</Label>
            <Select value={templateId ?? "none"} onValueChange={v => setTemplateId(v === "none" ? null : v)}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue placeholder="Kies template..." /></SelectTrigger>
              <SelectContent className="bg-erp-bg2 border-erp-border0">
                <SelectItem value="none">— Selecteer —</SelectItem>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ErpButton primary onClick={handleApply} disabled={!templateId || applyTemplate.isPending}>
            Toepassen
          </ErpButton>
        </div>
      </ErpCard>

      {questions.length === 0 ? (
        <ErpCard className="p-8 text-center text-erp-text3 text-sm">
          Nog geen onboarding vragen. Pas een template toe om te starten.
        </ErpCard>
      ) : (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>#</TH><TH>Vraag</TH><TH>Type</TH><TH>Verplicht</TH><TH>Antwoord</TH></tr>
            </thead>
            <tbody>
              {questions.map((q: any, i: number) => (
                <TR key={q.id}>
                  <TD className="text-erp-text3 text-xs w-10">{i + 1}</TD>
                  <TD>
                    <div className="text-erp-text0 font-medium text-sm">{q.question}</div>
                    {q.section_title && <div className="text-[10px] text-erp-text3">{q.section_title}</div>}
                  </TD>
                  <TD className="text-erp-text2 text-xs capitalize">{q.question_type}</TD>
                  <TD>
                    <Badge color={q.is_required ? "hsl(25,95%,53%)" : "hsl(var(--erp-text-3))"}>
                      {q.is_required ? "Ja" : "Nee"}
                    </Badge>
                  </TD>
                  <TD>
                    {q.response ? (
                      <span className="text-erp-green text-sm">{q.response.response_text || "✓ Beantwoord"}</span>
                    ) : (
                      <span className="text-erp-text3 text-xs">Niet beantwoord</span>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}
    </div>
  );
}

// ─── Files Tab ───

function FilesTab({ portalId, orgId }: { portalId: string; orgId: string }) {
  const { data: requests = [] } = usePortalFileRequests(portalId);
  const createReq = useCreateFileRequest();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [required, setRequired] = useState(true);

  const handleCreate = () => {
    if (!title.trim()) return;
    createReq.mutate(
      {
        organization_id: orgId,
        portal_session_id: portalId,
        title: title.trim(),
        description: desc.trim() || undefined,
        required,
      },
      {
        onSuccess: () => {
          toast.success("Bestand aanvraag aangemaakt");
          setDialogOpen(false);
          setTitle("");
          setDesc("");
          setRequired(true);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const statusMap: Record<string, [string, string]> = {
    pending: ["Wachtend", "hsl(45,93%,47%)"],
    uploaded: ["Geüpload", "hsl(210,100%,56%)"],
    approved: ["Goedgekeurd", "hsl(142,71%,45%)"],
    rejected: ["Afgewezen", "hsl(0,84%,60%)"],
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Bestand aanvragen
        </ErpButton>
      </div>

      {requests.length === 0 ? (
        <ErpCard className="p-8 text-center text-erp-text3 text-sm">
          Geen bestandsaanvragen. Maak er een aan om bestanden van de klant te ontvangen.
        </ErpCard>
      ) : (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>Titel</TH><TH>Beschrijving</TH><TH>Verplicht</TH><TH>Status</TH><TH>Aangemaakt</TH></tr>
            </thead>
            <tbody>
              {requests.map((r: any) => {
                const [sl, sc] = statusMap[r.status] || ["?", "hsl(var(--erp-text-3))"];
                return (
                  <TR key={r.id}>
                    <TD className="font-medium text-erp-text0">{r.title}</TD>
                    <TD className="text-erp-text2 text-xs">{r.description || "—"}</TD>
                    <TD>{r.required ? "Ja" : "Nee"}</TD>
                    <TD><Badge color={sc}><Dot color={sc} size={5} />{sl}</Badge></TD>
                    <TD className="text-erp-text2 text-xs">{format(new Date(r.created_at), "d MMM yyyy", { locale: nl })}</TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">Bestand aanvragen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Titel *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Bijv. KvK uittreksel" />
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Beschrijving</Label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full bg-erp-bg3 border border-erp-border1 text-erp-text0 text-sm rounded-md px-3 py-2 resize-none h-16"
                placeholder="Omschrijving van het bestand..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={required} onCheckedChange={v => setRequired(v === true)} className="border-erp-border1" />
              <Label className="text-erp-text2 text-xs">Verplicht</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ErpButton onClick={() => setDialogOpen(false)}>Annuleren</ErpButton>
              <ErpButton primary onClick={handleCreate} disabled={createReq.isPending || !title.trim()}>
                Aanvragen
              </ErpButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Activity Tab ───

function ActivityTab({ portalId }: { portalId: string }) {
  const { data: activity = [] } = usePortalActivity(portalId);

  return (
    <ErpCard className="p-4">
      {activity.length === 0 ? (
        <div className="text-erp-text3 text-sm text-center py-8">Nog geen activiteit geregistreerd</div>
      ) : (
        <div className="space-y-3">
          {activity.map((a: any) => (
            <div key={a.id} className="flex items-start gap-3 py-2 border-b border-erp-border0 last:border-0">
              <div className="w-2 h-2 rounded-full bg-erp-blue mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-erp-text0 font-medium">{a.action}</div>
                {a.details && Object.keys(a.details).length > 0 && (
                  <div className="text-xs text-erp-text3 mt-0.5">
                    {JSON.stringify(a.details)}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-erp-text3 whitespace-nowrap">
                {format(new Date(a.created_at), "d MMM HH:mm", { locale: nl })}
              </div>
            </div>
          ))}
        </div>
      )}
    </ErpCard>
  );
}
