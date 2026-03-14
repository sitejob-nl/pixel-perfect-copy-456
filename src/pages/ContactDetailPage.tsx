import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, ErpButton, ErpCard, Badge, Dot, Chip, Avatar } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { stageColors, stageLabels, tierColors } from "@/data/mockData";
import type { ContactWithCompany } from "@/hooks/useContacts";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import ContactWhatsAppTab from "@/components/whatsapp/ContactWhatsAppTab";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-erp-text3 w-36 shrink-0 text-sm">{label}</span>
      <span className="text-erp-text0 text-sm truncate">{value}</span>
    </div>
  );
}

function LinkRow({ label, href, display }: { label: string; href: string; display: string }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-erp-text3 w-36 shrink-0 text-sm">{label}</span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm truncate">
        {display}
      </a>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider mb-2">{children}</div>
  );
}

const activityIcon = (type: string) => {
  switch (type) {
    case "call": return "📞";
    case "email": return "📧";
    case "meeting": return "🤝";
    case "note": return "📝";
    default: return "⚡";
  }
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "whatsapp">("details");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    temperature: "warm",
    source: "",
    lifecycle_stage: "lead",
    company_id: null as string | null,
  });

  // Fetch single contact
  const { data: contact, isLoading, error } = useQuery({
    queryKey: ["contact", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(name, industry, city)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as ContactWithCompany;
    },
  });

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name,
        last_name: contact.last_name ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        job_title: contact.job_title ?? "",
        temperature: contact.temperature ?? "warm",
        source: contact.source ?? "",
        lifecycle_stage: contact.lifecycle_stage ?? "lead",
        company_id: contact.company_id,
      });
      setEditing(false);
    }
  }, [contact]);

  // Companies for linking
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Activities
  const { data: activities = [] } = useQuery({
    queryKey: ["contact-activities", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, subject, activity_type, created_at, description")
        .eq("contact_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Deals linked to contact
  const { data: deals = [] } = useQuery({
    queryKey: ["contact-deals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, stage_id, created_at")
        .eq("contact_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Internal notes with author info
  const { data: notes = [] } = useQuery({
    queryKey: ["contact-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_notes")
        .select("id, content, created_at, updated_at, user_id, profiles:user_id(full_name, email)")
        .eq("contact_id", id!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Array<{
        id: string;
        content: string;
        created_at: string;
        updated_at: string;
        user_id: string;
        profiles: { full_name: string | null; email: string | null } | null;
      }>;
    },
    enabled: !!id,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !org) throw new Error("Niet ingelogd");
      const { error } = await supabase.from("contact_notes").insert({
        contact_id: id!,
        organization_id: org.organization_id,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-notes", id] });
      setNoteText("");
      toast.success("Notitie toegevoegd");
    },
    onError: (err) => toast.error(`Fout: ${err.message}`),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("contact_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-notes", id] });
      toast.success("Notitie verwijderd");
    },
    onError: (err) => toast.error(`Fout: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!contact) return;
      const { error } = await supabase
        .from("contacts")
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          job_title: form.job_title.trim() || null,
          temperature: form.temperature,
          source: form.source.trim() || null,
          lifecycle_stage: form.lifecycle_stage,
          company_id: form.company_id,
        })
        .eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      toast.success("Contact bijgewerkt!");
      setEditing(false);
    },
    onError: (err) => toast.error(`Fout: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!contact) return;
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact verwijderd");
      navigate("/contacts");
    },
    onError: (err) => toast.error(`Fout: ${err.message}`),
  });

  if (isLoading) {
    return (
      <div className="animate-fade-up max-w-[1000px]">
        <ErpCard className="p-8 text-center text-erp-text2 text-sm">Contact laden...</ErpCard>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="animate-fade-up max-w-[1000px]">
        <ErpCard className="p-8 text-center text-erp-text3 text-sm">
          Contact niet gevonden.
          <div className="mt-3">
            <ErpButton onClick={() => navigate("/contacts")}>← Terug naar contacten</ErpButton>
          </div>
        </ErpCard>
      </div>
    );
  }

  const tier = contact.temperature ?? "warm";
  const stage = contact.lifecycle_stage ?? "lead";

  return (
    <div className="animate-fade-up max-w-[1000px]">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/contacts")}
          className="text-xs text-erp-text3 hover:text-erp-text0 mb-3 flex items-center gap-1 transition-colors"
        >
          <Icons.ChevDown className="w-3.5 h-3.5 rotate-90" /> Contacten
        </button>
        <div className="flex items-center gap-4">
          <Avatar name={`${contact.first_name} ${contact.last_name ?? ""}`} id={contact.id.charCodeAt(0)} size={48} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-erp-text0">
              {contact.first_name} {contact.last_name}
            </h1>
            <div className="text-sm text-erp-text3 mt-0.5">
              {contact.email ?? "Geen e-mail"}
              {contact.job_title && ` · ${contact.job_title}`}
              {contact.companies?.name && ` · ${contact.companies.name}`}
            </div>
          </div>
          <div className="flex gap-2">
            <Badge color={tierColors[tier] ?? "#6b7280"}>
              <Dot color={tierColors[tier] ?? "#6b7280"} /> {tier}
            </Badge>
            <Badge color={stageColors[stage] ?? "#6b7280"}>
              <Dot color={stageColors[stage] ?? "#6b7280"} size={5} />
              {stageLabels[stage] ?? stage}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Details + Edit */}
        <div className="lg:col-span-2 space-y-4">
          {editing ? (
            <ErpCard className="p-5">
              <SectionTitle>Contact bewerken</SectionTitle>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-erp-text2 text-xs">Voornaam *</Label>
                    <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-erp-text2 text-xs">Achternaam</Label>
                    <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-erp-text2 text-xs">E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-erp-text2 text-xs">Telefoon</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-erp-text2 text-xs">Functietitel</Label>
                  <Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-erp-text2 text-xs">Temperatuur</Label>
                    <Select value={form.temperature} onValueChange={v => setForm(f => ({ ...f, temperature: v }))}>
                      <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-erp-bg2 border-erp-border0">
                        <SelectItem value="hot">🔥 Hot</SelectItem>
                        <SelectItem value="warm">🟡 Warm</SelectItem>
                        <SelectItem value="cold">❄️ Cold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-erp-text2 text-xs">Status</Label>
                    <Select value={form.lifecycle_stage} onValueChange={v => setForm(f => ({ ...f, lifecycle_stage: v }))}>
                      <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-erp-bg2 border-erp-border0">
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="contacted">Gecontacteerd</SelectItem>
                        <SelectItem value="qualified">Gekwalificeerd</SelectItem>
                        <SelectItem value="opportunity">Kans</SelectItem>
                        <SelectItem value="customer">Klant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-erp-text2 text-xs">Bedrijf</Label>
                  <Select value={form.company_id ?? "none"} onValueChange={v => setForm(f => ({ ...f, company_id: v === "none" ? null : v }))}>
                    <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-erp-bg2 border-erp-border0">
                      <SelectItem value="none">— Geen bedrijf —</SelectItem>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-erp-text2 text-xs">Bron</Label>
                  <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <ErpButton onClick={() => setEditing(false)}>Annuleren</ErpButton>
                  <ErpButton primary onClick={() => updateMutation.mutate()}>
                    {updateMutation.isPending ? "Opslaan..." : "Opslaan"}
                  </ErpButton>
                </div>
              </div>
            </ErpCard>
          ) : (
            <>
              {/* Contact details card */}
              <ErpCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>Contactgegevens</SectionTitle>
                  <div className="flex gap-2">
                    <ErpButton onClick={() => setEditing(true)}>
                      <Icons.Edit className="w-3.5 h-3.5" /> Bewerken
                    </ErpButton>
                    <ErpButton onClick={() => {
                      if (confirm("Weet je zeker dat je dit contact wilt verwijderen?")) {
                        deleteMutation.mutate();
                      }
                    }}>
                      <Icons.Trash className="w-3.5 h-3.5" /> Verwijderen
                    </ErpButton>
                  </div>
                </div>
                {contact.phone && <DetailRow label="Telefoon" value={contact.phone} />}
                {contact.mobile && <DetailRow label="Mobiel" value={contact.mobile} />}
                {contact.job_title && <DetailRow label="Functie" value={contact.job_title} />}
                {contact.companies?.name && <DetailRow label="Bedrijf" value={`${contact.companies.name}${contact.companies.industry ? ` · ${contact.companies.industry}` : ""}${contact.companies.city ? ` · ${contact.companies.city}` : ""}`} />}
                {contact.linkedin_url && (
                  <LinkRow
                    label="LinkedIn"
                    href={contact.linkedin_url}
                    display={contact.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") || contact.linkedin_url}
                  />
                )}
              </ErpCard>

              {/* Lead info card */}
              <ErpCard className="p-5">
                <SectionTitle>Lead informatie</SectionTitle>
                <DetailRow label="Score" value={String(contact.lead_score ?? 0)} />
                {contact.score_tier && <DetailRow label="Score tier" value={contact.score_tier} />}
                {contact.lead_status && <DetailRow label="Lead status" value={contact.lead_status} />}
                {contact.source && <DetailRow label="Bron" value={contact.source} />}
                {contact.enrichment_status && <DetailRow label="Verrijking" value={contact.enrichment_status} />}
              </ErpCard>

              {/* UTM */}
              {(contact.utm_source || contact.utm_medium || contact.utm_campaign) && (
                <ErpCard className="p-5">
                  <SectionTitle>UTM / Campagne</SectionTitle>
                  {contact.utm_source && <DetailRow label="UTM Source" value={contact.utm_source} />}
                  {contact.utm_medium && <DetailRow label="UTM Medium" value={contact.utm_medium} />}
                  {contact.utm_campaign && <DetailRow label="UTM Campaign" value={contact.utm_campaign} />}
                </ErpCard>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <ErpCard className="p-5">
                  <SectionTitle>Tags</SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag, i) => (
                      <Chip key={i}>{tag}</Chip>
                    ))}
                  </div>
                </ErpCard>
              )}

              {/* Custom fields */}
              {contact.custom_fields && typeof contact.custom_fields === "object" && Object.keys(contact.custom_fields as Record<string, unknown>).length > 0 && (
                <ErpCard className="p-5">
                  <SectionTitle>Extra velden</SectionTitle>
                  {Object.entries(contact.custom_fields as Record<string, unknown>).map(([key, val]) => (
                    <DetailRow key={key} label={key} value={val != null ? String(val) : "—"} />
                  ))}
                </ErpCard>
              )}

              {/* Dates & preferences */}
              <ErpCard className="p-5">
                <SectionTitle>Datums & voorkeuren</SectionTitle>
                {contact.customer_since && <DetailRow label="Klant sinds" value={new Date(contact.customer_since).toLocaleDateString("nl-NL")} />}
                {contact.last_contacted_at && <DetailRow label="Laatst gecontacteerd" value={formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true, locale: nl })} />}
                {contact.last_activity_at && <DetailRow label="Laatste activiteit" value={formatDistanceToNow(new Date(contact.last_activity_at), { addSuffix: true, locale: nl })} />}
                {contact.next_follow_up_at && <DetailRow label="Follow-up" value={new Date(contact.next_follow_up_at).toLocaleDateString("nl-NL")} />}
                <DetailRow label="Aangemaakt" value={new Date(contact.created_at).toLocaleDateString("nl-NL")} />
                <DetailRow label="E-mail opt-out" value={contact.email_opt_out ? "Ja" : "Nee"} />
                <DetailRow label="WhatsApp opt-in" value={contact.whatsapp_opt_in ? "Ja" : "Nee"} />
              </ErpCard>
            </>
          )}
        </div>

        {/* Right column: Activities & Deals */}
        <div className="space-y-4">
          {/* Deals */}
          {deals.length > 0 && (
            <ErpCard className="p-5">
              <SectionTitle>Deals</SectionTitle>
              <div className="space-y-2">
                {deals.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-erp-border0 last:border-0">
                    <span className="text-sm text-erp-text0 truncate">{d.title}</span>
                    {d.value != null && (
                      <span className="text-xs text-erp-text2 shrink-0 ml-2">
                        €{d.value.toLocaleString("nl-NL")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ErpCard>
          )}

          {/* Activities */}
          <ErpCard className="p-5">
            <SectionTitle>Activiteiten</SectionTitle>
            {activities.length === 0 && (
              <div className="text-xs text-erp-text3">Geen activiteiten gevonden.</div>
            )}
            <div className="space-y-0">
              {activities.map((a, i) => (
                <div key={a.id} className={`flex items-start gap-2.5 py-2.5 ${i < activities.length - 1 ? "border-b border-erp-border0" : ""}`}>
                  <span className="text-sm mt-0.5">{activityIcon(a.activity_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-erp-text0 truncate">{a.subject}</div>
                    {a.description && (
                      <div className="text-xs text-erp-text3 mt-0.5 line-clamp-2">{a.description}</div>
                    )}
                    <div className="text-[11px] text-erp-text3 mt-0.5">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: nl })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ErpCard>

          {/* Internal Notes */}
          <ErpCard className="p-5">
            <SectionTitle>Interne notities</SectionTitle>
            <div className="mb-3">
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Schrijf een interne notitie..."
                className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm min-h-[60px] resize-none"
                rows={2}
              />
              <div className="flex justify-end mt-2">
                <ErpButton
                  primary
                  onClick={() => {
                    if (noteText.trim()) addNoteMutation.mutate(noteText.trim());
                  }}
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? "Toevoegen..." : "Notitie toevoegen"}
                </ErpButton>
              </div>
            </div>
            {notes.length === 0 && (
              <div className="text-xs text-erp-text3">Nog geen notities.</div>
            )}
            <div className="space-y-0">
              {notes.map((n, i) => {
                const authorName = n.profiles?.full_name || n.profiles?.email || "Onbekend";
                const isOwn = n.user_id === user?.id;
                return (
                  <div key={n.id} className={`py-2.5 ${i < notes.length - 1 ? "border-b border-erp-border0" : ""}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={authorName} id={n.user_id.charCodeAt(0)} size={20} />
                        <span className="text-xs font-medium text-erp-text0">{authorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-erp-text3">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: nl })}
                        </span>
                        {isOwn && (
                          <button
                            onClick={() => deleteNoteMutation.mutate(n.id)}
                            className="text-erp-text3 hover:text-erp-red transition-colors ml-1"
                            title="Verwijderen"
                          >
                            <Icons.Trash className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-erp-text1 whitespace-pre-wrap">{n.content}</div>
                  </div>
                );
              })}
            </div>
          </ErpCard>
        </div>
      </div>
    </div>
  );
}
