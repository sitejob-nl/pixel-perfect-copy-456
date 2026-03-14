import { useState, useEffect } from "react";
import { Zap, Plus, Play, Pencil, Trash2, ToggleLeft, ToggleRight, ArrowRightLeft, PlusCircle, Clock, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

async function invokeAutomations(action: string, body: any = {}) {
  const res = await supabase.functions.invoke("lead-automations", { body: { action, ...body } });
  if (res.error) throw res.error;
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

const VARIABLE_CHIPS = ["first_name","last_name","full_name","company","deal_title","deal_value","stage","old_stage","new_stage","expected_close","email"];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<any[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testDialog, setTestDialog] = useState<any>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [viewTab, setViewTab] = useState<"active" | "inactive" | "logs">("active");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [autoData, stageData] = await Promise.all([
        invokeAutomations("list_automations"),
        invokeAutomations("get_pipeline_stages"),
      ]);
      setAutomations(autoData.automations || []);
      setStages(stageData.stages || []);
    } catch {} finally { setLoading(false); }
  };

  const toggleActive = async (a: any) => {
    try {
      await invokeAutomations("update_automation", { automation_id: a.id, is_active: !a.is_active });
      toast.success(a.is_active ? "Automation uitgeschakeld" : "Automation ingeschakeld");
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (a: any) => {
    if (!confirm(`"${a.name}" verwijderen?`)) return;
    try {
      await invokeAutomations("delete_automation", { automation_id: a.id });
      toast.success("Verwijderd");
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const getStageName = (id: string) => stages.find(s => s.id === id)?.name || id;

  const triggerDescription = (a: any) => {
    if (a.trigger_type === "deal_created") return "Wanneer nieuwe deal wordt aangemaakt";
    if (a.trigger_type === "inactivity") return `Wanneer deal ${a.trigger_config?.days_inactive || 7} dagen inactief is`;
    if (a.trigger_type === "stage_change") {
      const c = a.trigger_config || {};
      if (c.on_won) return "Wanneer deal gewonnen wordt";
      if (c.on_lost) return "Wanneer deal verloren wordt";
      const from = c.from_stage_id ? getStageName(c.from_stage_id) : "elke stage";
      const to = c.to_stage_id ? getStageName(c.to_stage_id) : "elke stage";
      return `Wanneer deal van ${from} naar ${to} gaat`;
    }
    return a.trigger_type;
  };

  const messageTypeBadge = (type: string) => {
    const map: Record<string, string> = { text: "Tekst", template: "Template", interactive_buttons: "Knoppen", interactive_list: "Lijst" };
    return map[type] || type;
  };

  const active = automations.filter(a => a.is_active);
  const inactive = automations.filter(a => !a.is_active);

  const tabs = [
    { key: "active" as const, label: `Actief (${active.length})` },
    { key: "inactive" as const, label: `Inactief (${inactive.length})` },
    { key: "logs" as const, label: "Logs" },
  ];

  const displayList = viewTab === "active" ? active : viewTab === "inactive" ? inactive : [];

  if (loading) return <div className="text-[13px] text-erp-text3 py-8 text-center">Laden...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-erp-text0">WhatsApp Automations</h3>
          <p className="text-[12px] text-erp-text3 mt-0.5">Stuur automatisch berichten bij deal events</p>
        </div>
        <button onClick={() => { setEditingId(null); setWizardOpen(true); }} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium text-white" style={{ background: "hsl(var(--primary))" }}>
          <Plus className="w-3.5 h-3.5" /> Nieuwe automation
        </button>
      </div>

      <div className="flex gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setViewTab(t.key)} className={cn("px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors", viewTab === t.key ? "bg-erp-bg3 text-erp-text0" : "text-erp-text3 hover:text-erp-text1")}>{t.label}</button>
        ))}
      </div>

      {viewTab === "logs" ? (
        <LogsViewer automations={automations} />
      ) : displayList.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 mx-auto mb-3 text-erp-text3 opacity-20" />
          <p className="text-[14px] font-medium text-erp-text2 mb-1">Nog geen automations</p>
          <p className="text-[13px] text-erp-text3 mb-4">Stuur automatisch WhatsApp berichten wanneer deals van status veranderen.</p>
          <button onClick={() => { setEditingId(null); setWizardOpen(true); }} className="px-4 h-9 rounded-lg text-[13px] font-medium text-white" style={{ background: "hsl(var(--primary))" }}>Nieuwe automation</button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map(a => (
            <div key={a.id} className="border border-erp-border0 rounded-lg p-4 hover:bg-erp-bg3/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium text-erp-text0">{a.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTestDialog(a)} className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center text-erp-text2" title="Testen"><Play className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setEditingId(a.id); setWizardOpen(true); }} className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center text-erp-text2" title="Bewerken"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(a)} className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center text-erp-red" title="Verwijderen"><Trash2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(a)} className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center" title={a.is_active ? "Uitschakelen" : "Inschakelen"}>
                    {a.is_active ? <ToggleRight className="w-5 h-5" style={{ color: "hsl(142, 70%, 45%)" }} /> : <ToggleLeft className="w-5 h-5 text-erp-text3" />}
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-erp-text2 mb-1">{triggerDescription(a)}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-erp-bg3 text-erp-text2">{messageTypeBadge(a.message_type)}</span>
                {a.delay_minutes > 0 && <span className="text-[10px] text-erp-text3">⏱ {a.delay_minutes} min vertraging</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wizard */}
      <AutomationWizard open={wizardOpen} onOpenChange={setWizardOpen} automationId={editingId} stages={stages} automations={automations} onSaved={loadData} />

      {/* Test Dialog */}
      {testDialog && <TestDialog automation={testDialog} onClose={() => setTestDialog(null)} />}
    </div>
  );
}

// ─── Automation Wizard ──────────────────
function AutomationWizard({ open, onOpenChange, automationId, stages, automations, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; automationId: string | null; stages: any[]; automations: any[]; onSaved: () => void;
}) {
  const existing = automationId ? automations.find(a => a.id === automationId) : null;
  const [step, setStep] = useState(1);
  const [triggerType, setTriggerType] = useState(existing?.trigger_type || "");
  const [triggerConfig, setTriggerConfig] = useState<any>(existing?.trigger_config || {});
  const [messageType, setMessageType] = useState(existing?.message_type || "text");
  const [messageConfig, setMessageConfig] = useState<any>(existing?.message_config || { text: "" });
  const [delayMinutes, setDelayMinutes] = useState(existing?.delay_minutes || 0);
  const [name, setName] = useState(existing?.name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existing) {
        setStep(1); setTriggerType(existing.trigger_type); setTriggerConfig(existing.trigger_config || {});
        setMessageType(existing.message_type); setMessageConfig(existing.message_config || { text: "" });
        setDelayMinutes(existing.delay_minutes || 0); setName(existing.name);
      } else {
        setStep(1); setTriggerType(""); setTriggerConfig({}); setMessageType("text");
        setMessageConfig({ text: "" }); setDelayMinutes(0); setName("");
      }
    }
  }, [open, automationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { name, trigger_type: triggerType, trigger_config: triggerConfig, message_type: messageType, message_config: messageConfig, delay_minutes: delayMinutes, is_active: true };
      if (automationId) {
        await invokeAutomations("update_automation", { automation_id: automationId, ...body });
      } else {
        await invokeAutomations("create_automation", body);
      }
      toast.success("Automation opgeslagen");
      onOpenChange(false);
      onSaved();
    } catch (err: any) { toast.error(err.message || "Opslaan mislukt"); }
    finally { setSaving(false); }
  };

  const insertVariable = (v: string) => {
    if (messageType === "text") {
      setMessageConfig((c: any) => ({ ...c, text: (c.text || "") + `{{${v}}}` }));
    } else if (messageType === "interactive_buttons" || messageType === "interactive_list") {
      setMessageConfig((c: any) => ({ ...c, body_text: (c.body_text || "") + `{{${v}}}` }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-erp-text0 text-[15px]">{automationId ? "Automation bewerken" : "Nieuwe automation"}</SheetTitle>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {[1,2,3].map(s => (
            <div key={s} className={cn("flex-1 h-1 rounded-full", s <= step ? "bg-primary" : "bg-erp-bg3")} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-erp-text0 mb-3">Wanneer moet dit vuren?</p>
            
            {/* Stage change */}
            <button onClick={() => setTriggerType("stage_change")} className={cn("w-full text-left p-4 rounded-lg border transition-colors", triggerType === "stage_change" ? "border-primary bg-primary/5" : "border-erp-border0 hover:bg-erp-bg3")}>
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[13px] font-medium text-erp-text0">Deal stage wijziging</p>
                  <p className="text-[11px] text-erp-text3">Wanneer een deal van stage verandert</p>
                </div>
              </div>
            </button>
            {triggerType === "stage_change" && (
              <div className="pl-8 space-y-2">
                <Select value={triggerConfig.from_stage_id || "any"} onValueChange={v => setTriggerConfig((c: any) => ({ ...c, from_stage_id: v === "any" ? undefined : v }))}>
                  <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[12px]"><SelectValue placeholder="Van stage" /></SelectTrigger>
                  <SelectContent className="bg-erp-bg2 border-erp-border0">
                    <SelectItem value="any">Elke stage</SelectItem>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={triggerConfig.to_stage_id || "any"} onValueChange={v => setTriggerConfig((c: any) => ({ ...c, to_stage_id: v === "any" ? undefined : v }))}>
                  <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[12px]"><SelectValue placeholder="Naar stage" /></SelectTrigger>
                  <SelectContent className="bg-erp-bg2 border-erp-border0">
                    <SelectItem value="any">Elke stage</SelectItem>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-[12px] text-erp-text1">
                    <input type="checkbox" checked={!!triggerConfig.on_won} onChange={e => setTriggerConfig((c: any) => ({ ...c, on_won: e.target.checked || undefined }))} className="rounded" /> Bij gewonnen deal
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-erp-text1">
                    <input type="checkbox" checked={!!triggerConfig.on_lost} onChange={e => setTriggerConfig((c: any) => ({ ...c, on_lost: e.target.checked || undefined }))} className="rounded" /> Bij verloren deal
                  </label>
                </div>
              </div>
            )}

            {/* Deal created */}
            <button onClick={() => { setTriggerType("deal_created"); setTriggerConfig({}); }} className={cn("w-full text-left p-4 rounded-lg border transition-colors", triggerType === "deal_created" ? "border-primary bg-primary/5" : "border-erp-border0 hover:bg-erp-bg3")}>
              <div className="flex items-center gap-3">
                <PlusCircle className="w-5 h-5" style={{ color: "hsl(142, 70%, 45%)" }} />
                <div><p className="text-[13px] font-medium text-erp-text0">Nieuwe deal</p><p className="text-[11px] text-erp-text3">Wanneer een deal wordt aangemaakt</p></div>
              </div>
            </button>

            {/* Inactivity */}
            <button onClick={() => { setTriggerType("inactivity"); setTriggerConfig({ days_inactive: 7 }); }} className={cn("w-full text-left p-4 rounded-lg border transition-colors", triggerType === "inactivity" ? "border-primary bg-primary/5" : "border-erp-border0 hover:bg-erp-bg3")}>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5" style={{ color: "hsl(30, 90%, 50%)" }} />
                <div><p className="text-[13px] font-medium text-erp-text0">Inactiviteit</p><p className="text-[11px] text-erp-text3">Wanneer een deal X dagen inactief is</p></div>
              </div>
            </button>
            {triggerType === "inactivity" && (
              <div className="pl-8">
                <Label className="text-erp-text2 text-[12px]">Dagen zonder activiteit</Label>
                <Input type="number" min={1} max={90} value={triggerConfig.days_inactive || 7} onChange={e => setTriggerConfig((c: any) => ({ ...c, days_inactive: parseInt(e.target.value) || 7 }))} className="w-24 text-[13px] bg-erp-bg3 border-erp-border0 h-8 mt-1" />
              </div>
            )}

            <div className="pt-4">
              <button onClick={() => setStep(2)} disabled={!triggerType} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(var(--primary))" }}>Volgende</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[13px] font-medium text-erp-text0 mb-2">Wat wil je versturen?</p>
            <div className="flex gap-1">
              {(["text","template","interactive_buttons","interactive_list"] as const).map(t => (
                <button key={t} onClick={() => { setMessageType(t); setMessageConfig(t === "text" ? { text: "" } : t === "template" ? {} : { body_text: "" }); }}
                  className={cn("px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors", messageType === t ? "bg-erp-bg3 text-erp-text0" : "text-erp-text3")}>
                  {t === "text" ? "Tekst" : t === "template" ? "Template" : t === "interactive_buttons" ? "Knoppen" : "Lijst"}
                </button>
              ))}
            </div>

            {/* Variable chips */}
            {messageType !== "template" && (
              <div className="flex flex-wrap gap-1">
                {VARIABLE_CHIPS.map(v => (
                  <button key={v} onClick={() => insertVariable(v)} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20">{`{{${v}}}`}</button>
                ))}
              </div>
            )}

            {messageType === "text" && (
              <Textarea value={messageConfig.text || ""} onChange={e => setMessageConfig({ text: e.target.value })} maxLength={1024} rows={5} placeholder="Typ je bericht..." className="text-[13px] bg-erp-bg3 border-erp-border0" />
            )}

            {messageType === "template" && (
              <div className="space-y-2">
                <Input value={messageConfig.template_name || ""} onChange={e => setMessageConfig((c: any) => ({ ...c, template_name: e.target.value }))} placeholder="Template naam" className="text-[13px] bg-erp-bg3 border-erp-border0" />
                <Input value={messageConfig.template_language || "nl"} onChange={e => setMessageConfig((c: any) => ({ ...c, template_language: e.target.value }))} placeholder="Taal (nl)" className="text-[13px] bg-erp-bg3 border-erp-border0" />
              </div>
            )}

            {messageType === "interactive_buttons" && (
              <div className="space-y-2">
                <Textarea value={messageConfig.body_text || ""} onChange={e => setMessageConfig((c: any) => ({ ...c, body_text: e.target.value }))} rows={3} placeholder="Body tekst..." className="text-[13px] bg-erp-bg3 border-erp-border0" />
                <Label className="text-erp-text2 text-[12px]">Knoppen</Label>
                {(messageConfig.buttons || [{ id: "btn_1", title: "" }]).map((b: any, i: number) => (
                  <Input key={i} value={b.title} onChange={e => {
                    const btns = [...(messageConfig.buttons || [{ id: "btn_1", title: "" }])];
                    btns[i].title = e.target.value;
                    setMessageConfig((c: any) => ({ ...c, buttons: btns }));
                  }} maxLength={20} placeholder={`Knop ${i + 1}`} className="text-[12px] bg-erp-bg3 border-erp-border0 h-8" />
                ))}
              </div>
            )}

            {/* Delay */}
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 text-[12px] text-erp-text1">
                <input type="checkbox" checked={delayMinutes > 0} onChange={e => setDelayMinutes(e.target.checked ? 5 : 0)} className="rounded" /> Vertraging
              </label>
              {delayMinutes > 0 && (
                <Input type="number" min={1} max={1440} value={delayMinutes} onChange={e => setDelayMinutes(parseInt(e.target.value) || 0)} className="w-20 text-[12px] bg-erp-bg3 border-erp-border0 h-7" />
              )}
              {delayMinutes > 0 && <span className="text-[11px] text-erp-text3">minuten</span>}
            </div>

            <div className="flex gap-2 pt-4">
              <button onClick={() => setStep(1)} className="flex-1 h-9 rounded-lg text-[13px] font-medium border border-erp-border0 text-erp-text1">Terug</button>
              <button onClick={() => setStep(3)} className="flex-1 h-9 rounded-lg text-[13px] font-medium text-white" style={{ background: "hsl(var(--primary))" }}>Volgende</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-erp-text2 text-[12px]">Naam *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bijv. Welkomstbericht nieuwe deal" className="text-[13px] bg-erp-bg3 border-erp-border0" />
            </div>

            <div className="bg-erp-bg3 rounded-lg p-4 space-y-2">
              <p className="text-[12px] font-medium text-erp-text0">Samenvatting</p>
              <div className="text-[12px] text-erp-text2 space-y-1">
                <p>Trigger: <span className="text-erp-text0">{triggerType}</span></p>
                <p>Bericht type: <span className="text-erp-text0">{messageType}</span></p>
                {delayMinutes > 0 && <p>Vertraging: <span className="text-erp-text0">{delayMinutes} min</span></p>}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button onClick={() => setStep(2)} className="flex-1 h-9 rounded-lg text-[13px] font-medium border border-erp-border0 text-erp-text1">Terug</button>
              <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(var(--primary))" }}>
                {saving ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Test Dialog ──────────────────
function TestDialog({ automation, onClose }: { automation: any; onClose: () => void }) {
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<string>("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { loadDeals(); }, []);

  const loadDeals = async () => {
    const { data } = await supabase.from("deals").select("id, title, value, contacts(first_name, last_name, phone, mobile), companies(name)").order("created_at", { ascending: false }).limit(20);
    setDeals(data || []);
  };

  const handleTest = async () => {
    if (!selectedDeal) return;
    setLoading(true);
    try {
      const data = await invokeAutomations("test_automation", { automation_id: automation.id, deal_id: selectedDeal });
      setPreview(data.preview);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const deal = deals.find(d => d.id === selectedDeal);
      await invokeAutomations("trigger_stage_change", { deal_id: selectedDeal, new_stage_id: deal?.stage_id });
      toast.success("Bericht verstuurd");
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSending(false); }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 max-w-md">
        <DialogHeader><DialogTitle className="text-erp-text0 text-[15px]">Test: {automation.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={selectedDeal} onValueChange={setSelectedDeal}>
            <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[13px]"><SelectValue placeholder="Selecteer een deal" /></SelectTrigger>
            <SelectContent className="bg-erp-bg2 border-erp-border0">
              {deals.map(d => (
                <SelectItem key={d.id} value={d.id} className="text-[13px]">
                  {d.title} {d.value ? `— €${d.value}` : ""} {(d.contacts as any)?.first_name ? `(${(d.contacts as any).first_name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!preview && (
            <button onClick={handleTest} disabled={!selectedDeal || loading} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(var(--primary))" }}>
              {loading ? "Testen..." : "Preview genereren"}
            </button>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="bg-erp-bg3 rounded-lg p-3 text-[12px] space-y-1">
                <p className="text-erp-text3">Naar: <span className="text-erp-text0 font-mono">{preview.to}</span></p>
                <p className="text-erp-text3">Contact: <span className="text-erp-text0">{preview.contact_name}</span></p>
                {preview.company_name && <p className="text-erp-text3">Bedrijf: <span className="text-erp-text0">{preview.company_name}</span></p>}
              </div>
              <div className="bg-erp-bg3 rounded-xl px-3 py-2">
                <p className="text-[13px] text-erp-text0 whitespace-pre-wrap">{preview.resolved_message}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 h-9 rounded-lg text-[13px] font-medium border border-erp-border0 text-erp-text1">Sluiten</button>
                <button onClick={handleSend} disabled={sending} className="flex-1 h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(var(--primary))" }}>
                  {sending ? "Versturen..." : "Echt versturen"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Logs Viewer ──────────────────
function LogsViewer({ automations }: { automations: any[] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAutomation, setFilterAutomation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { loadLogs(); }, [filterAutomation]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const body: any = { limit: 50 };
      if (filterAutomation !== "all") body.automation_id = filterAutomation;
      const data = await invokeAutomations("get_automation_logs", body);
      setLogs(data.logs || []);
    } catch {} finally { setLoading(false); }
  };

  const filtered = logs.filter(l => {
    if (filterStatus === "sent") return l.status === "sent" || l.status === "delivered";
    if (filterStatus === "failed") return l.status === "failed";
    return true;
  });

  const sent = logs.filter(l => l.status !== "failed").length;
  const failed = logs.filter(l => l.status === "failed").length;
  const pct = logs.length > 0 ? Math.round((sent / logs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-erp-bg3 rounded-lg p-3 text-center">
          <p className="text-[20px] font-bold" style={{ color: "hsl(142, 70%, 45%)" }}>{sent}</p>
          <p className="text-[11px] text-erp-text3">Verstuurd</p>
        </div>
        <div className="bg-erp-bg3 rounded-lg p-3 text-center">
          <p className="text-[20px] font-bold text-erp-red">{failed}</p>
          <p className="text-[11px] text-erp-text3">Mislukt</p>
        </div>
        <div className="bg-erp-bg3 rounded-lg p-3 text-center">
          <p className="text-[20px] font-bold text-primary">{pct}%</p>
          <p className="text-[11px] text-erp-text3">Succes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterAutomation} onValueChange={setFilterAutomation}>
          <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[12px] w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-erp-bg2 border-erp-border0">
            <SelectItem value="all">Alle automations</SelectItem>
            {automations.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[12px] w-32"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-erp-bg2 border-erp-border0">
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="sent">Verstuurd</SelectItem>
            <SelectItem value="failed">Mislukt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-[13px] text-erp-text3 py-4">Laden...</div>
      ) : filtered.length === 0 ? (
        <div className="text-[13px] text-erp-text3 text-center py-8">Geen logs</div>
      ) : (
        <div className="border border-erp-border0 rounded-lg overflow-hidden">
          {filtered.map(log => {
            const automationName = automations.find(a => a.id === log.automation_id)?.name || "Onbekend";
            return (
              <div key={log.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-erp-border0 last:border-0 text-[12px]">
                <span className="text-erp-text3 w-28 flex-shrink-0">
                  {new Date(log.created_at).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-erp-text0 truncate flex-1">{automationName}</span>
                <span className="text-erp-text2 font-mono w-28 truncate flex-shrink-0">{log.phone_number}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-erp-bg3 text-erp-text2 flex-shrink-0">{log.message_type}</span>
                <span className={cn("text-[10px] font-semibold flex-shrink-0", log.status === "failed" ? "text-erp-red" : "text-erp-text0")} style={log.status !== "failed" ? { color: "hsl(142, 70%, 45%)" } : undefined}>
                  {log.status === "failed" ? "Mislukt" : "Verstuurd"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
