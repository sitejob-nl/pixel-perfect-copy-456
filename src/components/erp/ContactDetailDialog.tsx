import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton, Badge, Dot, Chip, Avatar } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { stageColors, stageLabels, tierColors } from "@/data/mockData";
import type { ContactWithCompany } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-erp-text3 w-28 shrink-0">{label}</span>
      <span className="text-erp-text0 truncate">{value}</span>
    </div>
  );
}

interface Props {
  contact: ContactWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContactDetailDialog({ contact, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
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
    enabled: open,
  });

  // Activities for this contact
  const { data: activities = [] } = useQuery({
    queryKey: ["contact-activities", contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      const { data, error } = await supabase
        .from("activities")
        .select("id, subject, activity_type, created_at")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!contact && open,
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
      onOpenChange(false);
    },
    onError: (err) => toast.error(`Fout: ${err.message}`),
  });

  if (!contact) return null;

  const tier = contact.temperature ?? "warm";
  const stage = contact.lifecycle_stage ?? "lead";

  const activityIcon = (type: string) => {
    switch (type) {
      case "call": return "📞";
      case "email": return "📧";
      case "meeting": return "🤝";
      case "note": return "📝";
      default: return "⚡";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar name={`${contact.first_name} ${contact.last_name ?? ""}`} id={contact.id.charCodeAt(0)} size={40} />
            <div>
              <DialogTitle className="text-erp-text0">{contact.first_name} {contact.last_name}</DialogTitle>
              <div className="text-xs text-erp-text3 mt-0.5">{contact.email ?? "Geen e-mail"}</div>
            </div>
          </div>
        </DialogHeader>

        {/* Status badges */}
        <div className="flex gap-2 mb-3">
          <Badge color={tierColors[tier] ?? "#6b7280"}>
            <Dot color={tierColors[tier] ?? "#6b7280"} /> {tier}
          </Badge>
          <Badge color={stageColors[stage] ?? "#6b7280"}>
            <Dot color={stageColors[stage] ?? "#6b7280"} size={5} />
            {stageLabels[stage] ?? stage}
          </Badge>
          {contact.companies?.name && <Chip>{contact.companies.name}</Chip>}
        </div>

        {editing ? (
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
        ) : (
          <>
            {/* Detail view */}
            <div className="space-y-3 text-sm">
              {/* Basic info */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider">Contactgegevens</div>
                {contact.phone && <DetailRow label="Telefoon" value={contact.phone} />}
                {contact.mobile && <DetailRow label="Mobiel" value={contact.mobile} />}
                {contact.job_title && <DetailRow label="Functie" value={contact.job_title} />}
                {contact.linkedin_url && (
                  <div className="flex gap-2">
                    <span className="text-erp-text3 w-28 shrink-0">LinkedIn</span>
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {contact.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") || contact.linkedin_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Lead info */}
              <div className="space-y-1.5 pt-2 border-t border-erp-border0">
                <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider">Lead informatie</div>
                <DetailRow label="Score" value={String(contact.lead_score ?? 0)} />
                {contact.score_tier && <DetailRow label="Score tier" value={contact.score_tier} />}
                {contact.lead_status && <DetailRow label="Lead status" value={contact.lead_status} />}
                {contact.source && <DetailRow label="Bron" value={contact.source} />}
                {contact.enrichment_status && <DetailRow label="Verrijking" value={contact.enrichment_status} />}
              </div>

              {/* UTM data */}
              {(contact.utm_source || contact.utm_medium || contact.utm_campaign) && (
                <div className="space-y-1.5 pt-2 border-t border-erp-border0">
                  <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider">UTM / Campagne</div>
                  {contact.utm_source && <DetailRow label="UTM Source" value={contact.utm_source} />}
                  {contact.utm_medium && <DetailRow label="UTM Medium" value={contact.utm_medium} />}
                  {contact.utm_campaign && <DetailRow label="UTM Campaign" value={contact.utm_campaign} />}
                </div>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-erp-border0">
                  <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag, i) => (
                      <Chip key={i}>{tag}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom fields */}
              {contact.custom_fields && typeof contact.custom_fields === "object" && Object.keys(contact.custom_fields as Record<string, unknown>).length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-erp-border0">
                  <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider">Extra velden</div>
                  {Object.entries(contact.custom_fields as Record<string, unknown>).map(([key, val]) => (
                    <DetailRow key={key} label={key} value={val != null ? String(val) : "—"} />
                  ))}
                </div>
              )}

              {/* Dates */}
              <div className="space-y-1.5 pt-2 border-t border-erp-border0">
                <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider">Datums</div>
                {contact.customer_since && <DetailRow label="Klant sinds" value={new Date(contact.customer_since).toLocaleDateString("nl-NL")} />}
                {contact.last_contacted_at && <DetailRow label="Laatst gecontacteerd" value={formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true, locale: nl })} />}
                {contact.last_activity_at && <DetailRow label="Laatste activiteit" value={formatDistanceToNow(new Date(contact.last_activity_at), { addSuffix: true, locale: nl })} />}
                {contact.next_follow_up_at && <DetailRow label="Follow-up" value={new Date(contact.next_follow_up_at).toLocaleDateString("nl-NL")} />}
                <DetailRow label="Aangemaakt" value={new Date(contact.created_at).toLocaleDateString("nl-NL")} />
              </div>

              {/* Opt-in statuses */}
              <div className="space-y-1.5 pt-2 border-t border-erp-border0">
                <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider">Voorkeuren</div>
                <DetailRow label="E-mail opt-out" value={contact.email_opt_out ? "Ja" : "Nee"} />
                <DetailRow label="WhatsApp opt-in" value={contact.whatsapp_opt_in ? "Ja" : "Nee"} />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
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

            {/* Activity timeline */}
            <div className="pt-3 border-t border-erp-border0 mt-3">
              <div className="text-xs font-semibold text-erp-text2 mb-2">Activiteiten</div>
              {activities.length === 0 && <div className="text-xs text-erp-text3">Geen activiteiten gevonden.</div>}
              {activities.map((a, i) => (
                <div key={a.id} className={`flex items-center gap-2 py-2 ${i < activities.length - 1 ? "border-b border-erp-border0" : ""}`}>
                  <span className="text-sm">{activityIcon(a.activity_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-erp-text0 truncate">{a.subject}</div>
                    <div className="text-[11px] text-erp-text3">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: nl })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
