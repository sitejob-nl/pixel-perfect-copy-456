import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ErpCard, ErpButton } from "@/components/erp/ErpPrimitives";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save, Clock, Calendar, Shield, Palette, GripVertical } from "lucide-react";

const sb = supabase;

const DAY_LABELS: Record<string, string> = {
  monday: "Maandag", tuesday: "Dinsdag", wednesday: "Woensdag",
  thursday: "Donderdag", friday: "Vrijdag", saturday: "Zaterdag", sunday: "Zondag",
};
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function BookingPageSettings() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<"general" | "hours" | "events">("general");

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["booking-pages-full", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("booking_pages")
        .select("*, booking_event_types(*)")
        .eq("organization_id", orgId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const page = pages[0]; // For now single page

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>;
  if (!page) return <NoPageYet orgId={orgId} />;

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-2">
        {([["general", "Algemeen", Calendar], ["hours", "Werkuren", Clock], ["events", "Afspraaktypes", Palette]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              activeSection === key ? "bg-erp-blue/10 text-erp-blue" : "text-erp-text2 hover:bg-erp-bg3"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {activeSection === "general" && <GeneralSettings page={page} />}
      {activeSection === "hours" && <WorkingHoursSettings page={page} />}
      {activeSection === "events" && <EventTypesSettings page={page} orgId={orgId} />}
    </div>
  );
}

/* ── No page yet ── */
function NoPageYet({ orgId }: { orgId?: string }) {
  const qc = useQueryClient();
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!slug || !displayName || !orgId) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await sb.from("booking_pages").insert({
        organization_id: orgId,
        user_id: user!.id,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        display_name: displayName,
        working_hours: {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
        },
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Booking pagina aangemaakt!");
    } catch (e: any) {
      toast.error(e.message || "Fout bij aanmaken");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ErpCard className="p-6 text-center">
      <Calendar className="w-10 h-10 text-erp-text3 mx-auto mb-3" />
      <h3 className="text-[14px] font-semibold text-erp-text0 mb-1">Nog geen booking pagina</h3>
      <p className="text-[12px] text-erp-text2 mb-4">Maak je eerste booking pagina aan zodat klanten bij je kunnen inplannen.</p>
      <div className="max-w-xs mx-auto space-y-3">
        <Input placeholder="Je naam / bedrijfsnaam" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <div className="flex items-center gap-1 text-[12px] text-erp-text3">
          <span>/book/</span>
          <Input placeholder="jouw-slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" />
        </div>
        <ErpButton onClick={handleCreate} disabled={creating || !slug || !displayName}>
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Aanmaken
        </ErpButton>
      </div>
    </ErpCard>
  );
}

/* ── General Settings ── */
function GeneralSettings({ page }: { page: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    display_name: page.display_name || "",
    title: page.title || "",
    description: page.description || "",
    slug: page.slug || "",
    primary_color: page.primary_color || "#2563EB",
    timezone: page.timezone || "Europe/Amsterdam",
    min_notice_hours: page.min_notice_hours ?? 1,
    max_days_ahead: page.max_days_ahead ?? 60,
    buffer_before_minutes: page.buffer_before_minutes ?? 0,
    buffer_after_minutes: page.buffer_after_minutes ?? 0,
    is_active: page.is_active !== false,
    require_approval: page.require_approval || false,
    confirmation_message: page.confirmation_message || "",
    redirect_url: page.redirect_url || "",
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("booking_pages").update({
        ...form,
        min_notice_hours: Number(form.min_notice_hours),
        max_days_ahead: Number(form.max_days_ahead),
        buffer_before_minutes: Number(form.buffer_before_minutes),
        buffer_after_minutes: Number(form.buffer_after_minutes),
      }).eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Instellingen opgeslagen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upd = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <ErpCard className="p-5 space-y-4">
        <h3 className="text-[13px] font-semibold text-erp-text0 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-erp-blue" /> Pagina-informatie
        </h3>
        <Field label="Weergavenaam">
          <Input value={form.display_name} onChange={(e) => upd("display_name", e.target.value)} />
        </Field>
        <Field label="Titel (subtitle)">
          <Input value={form.title} onChange={(e) => upd("title", e.target.value)} placeholder="Bijv. Plan een gratis adviesgesprek" />
        </Field>
        <Field label="Beschrijving">
          <textarea
            value={form.description}
            onChange={(e) => upd("description", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Korte beschrijving op de pagina"
          />
        </Field>
        <Field label="Slug (URL)">
          <div className="flex items-center gap-1 text-[12px] text-erp-text3">
            <span className="shrink-0">/book/</span>
            <Input value={form.slug} onChange={(e) => upd("slug", e.target.value)} className="font-mono" />
          </div>
        </Field>
        <Field label="Primaire kleur">
          <div className="flex items-center gap-2">
            <input type="color" value={form.primary_color} onChange={(e) => upd("primary_color", e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
            <Input value={form.primary_color} onChange={(e) => upd("primary_color", e.target.value)} className="w-28 font-mono text-xs" />
          </div>
        </Field>
      </ErpCard>

      <ErpCard className="p-5 space-y-4">
        <h3 className="text-[13px] font-semibold text-erp-text0 flex items-center gap-2">
          <Shield className="w-4 h-4 text-erp-blue" /> Planning opties
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min. notice (uren)">
            <Input type="number" value={form.min_notice_hours} onChange={(e) => upd("min_notice_hours", e.target.value)} min={0} />
          </Field>
          <Field label="Max. dagen vooruit">
            <Input type="number" value={form.max_days_ahead} onChange={(e) => upd("max_days_ahead", e.target.value)} min={1} />
          </Field>
          <Field label="Buffer vóór (min)">
            <Input type="number" value={form.buffer_before_minutes} onChange={(e) => upd("buffer_before_minutes", e.target.value)} min={0} />
          </Field>
          <Field label="Buffer na (min)">
            <Input type="number" value={form.buffer_after_minutes} onChange={(e) => upd("buffer_after_minutes", e.target.value)} min={0} />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-erp-text1">Pagina actief</p>
            <p className="text-[11px] text-erp-text3">Deactiveer om boekingen tijdelijk te stoppen</p>
          </div>
          <Switch checked={form.is_active} onCheckedChange={(v) => upd("is_active", v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-erp-text1">Goedkeuring vereist</p>
            <p className="text-[11px] text-erp-text3">Boekingen moeten handmatig bevestigd worden</p>
          </div>
          <Switch checked={form.require_approval} onCheckedChange={(v) => upd("require_approval", v)} />
        </div>
      </ErpCard>

      <ErpCard className="p-5 space-y-4">
        <h3 className="text-[13px] font-semibold text-erp-text0">Na bevestiging</h3>
        <Field label="Bevestigingsbericht">
          <textarea
            value={form.confirmation_message}
            onChange={(e) => upd("confirmation_message", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Optioneel bericht na boeking"
          />
        </Field>
        <Field label="Redirect URL (optioneel)">
          <Input value={form.redirect_url} onChange={(e) => upd("redirect_url", e.target.value)} placeholder="https://..." />
        </Field>
      </ErpCard>

      <ErpButton onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
        {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Opslaan
      </ErpButton>
    </div>
  );
}

/* ── Working Hours ── */
function WorkingHoursSettings({ page }: { page: any }) {
  const qc = useQueryClient();
  const [hours, setHours] = useState<Record<string, { start: string; end: string } | null>>(
    page.working_hours || {}
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      // Filter out null days
      const clean: Record<string, any> = {};
      for (const [day, val] of Object.entries(hours)) {
        if (val) clean[day] = val;
      }
      const { error } = await sb.from("booking_pages").update({ working_hours: clean }).eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Werkuren opgeslagen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleDay = (day: string) => {
    setHours((h) => ({
      ...h,
      [day]: h[day] ? null : { start: "09:00", end: "17:00" },
    }));
  };

  const updateDay = (day: string, field: "start" | "end", val: string) => {
    setHours((h) => ({
      ...h,
      [day]: { ...(h[day] || { start: "09:00", end: "17:00" }), [field]: val },
    }));
  };

  return (
    <div className="space-y-4">
      <ErpCard className="p-5">
        <h3 className="text-[13px] font-semibold text-erp-text0 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-erp-blue" /> Beschikbare uren per dag
        </h3>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const active = !!hours[day];
            return (
              <div key={day} className="flex items-center gap-3">
                <Switch checked={active} onCheckedChange={() => toggleDay(day)} />
                <span className={`text-[12px] w-24 font-medium ${active ? "text-erp-text0" : "text-erp-text3"}`}>
                  {DAY_LABELS[day]}
                </span>
                {active ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hours[day]?.start || "09:00"}
                      onChange={(e) => updateDay(day, "start", e.target.value)}
                      className="w-28 text-xs"
                    />
                    <span className="text-erp-text3 text-xs">—</span>
                    <Input
                      type="time"
                      value={hours[day]?.end || "17:00"}
                      onChange={(e) => updateDay(day, "end", e.target.value)}
                      className="w-28 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-[11px] text-erp-text3">Niet beschikbaar</span>
                )}
              </div>
            );
          })}
        </div>
      </ErpCard>

      <ErpButton onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
        {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Opslaan
      </ErpButton>
    </div>
  );
}

/* ── Event Types ── */
function EventTypesSettings({ page, orgId }: { page: any; orgId?: string }) {
  const qc = useQueryClient();
  const eventTypes = page.booking_event_types || [];
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("booking_event_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Afspraaktype verwijderd");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-erp-text0">Afspraaktypes ({eventTypes.length})</h3>
        <ErpButton onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> Nieuw type
        </ErpButton>
      </div>

      {showCreate && (
        <EventTypeForm
          pageId={page.id}
          orgId={orgId}
          onDone={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["booking-pages"] });
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {eventTypes.map((et: any) => (
        <ErpCard key={et.id} className="p-4">
          {editingId === et.id ? (
            <EventTypeForm
              pageId={page.id}
              orgId={orgId}
              existing={et}
              onDone={() => {
                setEditingId(null);
                qc.invalidateQueries({ queryKey: ["booking-pages"] });
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-3 h-10 rounded-full shrink-0" style={{ background: et.color || "#2563EB" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-erp-text0">{et.name}</span>
                  {et.is_active === false && <span className="text-[10px] text-erp-text3 bg-erp-bg3 px-1.5 py-0.5 rounded">Inactief</span>}
                </div>
                <p className="text-[11px] text-erp-text2">{et.duration_minutes} min · {et.slug}</p>
                {et.description && <p className="text-[11px] text-erp-text3 mt-0.5">{et.description}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <ErpButton onClick={() => setEditingId(et.id)}>Bewerken</ErpButton>
                <button
                  onClick={() => { if (confirm("Verwijderen?")) deleteMut.mutate(et.id); }}
                  className="p-1.5 rounded-lg text-erp-text3 hover:text-erp-red hover:bg-erp-bg3 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </ErpCard>
      ))}

      {eventTypes.length === 0 && !showCreate && (
        <ErpCard className="p-6 text-center">
          <p className="text-[12px] text-erp-text3">Nog geen afspraaktypes. Maak er een aan om te beginnen.</p>
        </ErpCard>
      )}
    </div>
  );
}

/* ── Event Type Form ── */
function EventTypeForm({ pageId, orgId, existing, onDone, onCancel }: {
  pageId: string; orgId?: string; existing?: any; onDone: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    slug: existing?.slug || "",
    description: existing?.description || "",
    duration_minutes: existing?.duration_minutes || 30,
    color: existing?.color || "#2563EB",
    is_active: existing?.is_active !== false,
    location_type: existing?.location_type || "video",
    location_value: existing?.location_value || "",
    max_bookings_per_day: existing?.max_bookings_per_day || "",
    auto_create_contact: existing?.auto_create_contact !== false,
    auto_create_activity: existing?.auto_create_activity !== false,
  });
  const [saving, setSaving] = useState(false);

  const upd = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    upd("name", val);
    if (!existing) {
      upd("slug", val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration_minutes: Number(form.duration_minutes),
        max_bookings_per_day: form.max_bookings_per_day ? Number(form.max_bookings_per_day) : null,
        booking_page_id: pageId,
        organization_id: orgId,
      };
      if (existing) {
        const { error } = await sb.from("booking_event_types").update(payload).eq("id", existing.id);
        if (error) throw error;
        toast.success("Afspraaktype bijgewerkt");
      } else {
        const { error } = await sb.from("booking_event_types").insert(payload);
        if (error) throw error;
        toast.success("Afspraaktype aangemaakt");
      }
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Fout bij opslaan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ErpCard className="p-5 space-y-3 border-erp-blue/20">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Naam *">
          <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Bijv. Adviesgesprek" />
        </Field>
        <Field label="Slug *">
          <Input value={form.slug} onChange={(e) => upd("slug", e.target.value)} className="font-mono text-xs" />
        </Field>
      </div>
      <Field label="Beschrijving">
        <Input value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="Korte omschrijving" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Duur (min)">
          <Input type="number" value={form.duration_minutes} onChange={(e) => upd("duration_minutes", e.target.value)} min={5} />
        </Field>
        <Field label="Kleur">
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={(e) => upd("color", e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
            <Input value={form.color} onChange={(e) => upd("color", e.target.value)} className="w-20 font-mono text-xs" />
          </div>
        </Field>
        <Field label="Max per dag">
          <Input type="number" value={form.max_bookings_per_day} onChange={(e) => upd("max_bookings_per_day", e.target.value)} min={0} placeholder="∞" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Locatietype">
          <select
            value={form.location_type}
            onChange={(e) => upd("location_type", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="video">Videocall</option>
            <option value="phone">Telefoon</option>
            <option value="in_person">Op locatie</option>
            <option value="custom">Overig</option>
          </select>
        </Field>
        <Field label="Locatie URL / adres">
          <Input value={form.location_value} onChange={(e) => upd("location_value", e.target.value)} placeholder="https://meet.google.com/..." />
        </Field>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-[12px] text-erp-text1">
          <Switch checked={form.is_active} onCheckedChange={(v) => upd("is_active", v)} /> Actief
        </label>
        <label className="flex items-center gap-2 text-[12px] text-erp-text1">
          <Switch checked={form.auto_create_contact} onCheckedChange={(v) => upd("auto_create_contact", v)} /> Auto-contact
        </label>
        <label className="flex items-center gap-2 text-[12px] text-erp-text1">
          <Switch checked={form.auto_create_activity} onCheckedChange={(v) => upd("auto_create_activity", v)} /> Auto-activiteit
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <ErpButton onClick={handleSave} disabled={saving || !form.name || !form.slug}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {existing ? "Bijwerken" : "Aanmaken"}
        </ErpButton>
        <ErpButton onClick={onCancel}>Annuleren</ErpButton>
      </div>
    </ErpCard>
  );
}

/* ── Field helper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-erp-text2 mb-1">{label}</label>
      {children}
    </div>
  );
}
