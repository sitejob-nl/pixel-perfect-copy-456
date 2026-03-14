import { useState, useEffect } from "react";
import { Zap, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CRM_FIELDS = [
  { key: "first_name", label: "Voornaam" },
  { key: "last_name", label: "Achternaam" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefoon" },
  { key: "company_name", label: "Bedrijf" },
  { key: "deal_title", label: "Deal titel" },
  { key: "deal_value", label: "Deal waarde" },
] as const;

const TRIGGER_TYPES = [
  { value: "lead_created", label: "Lead aangemaakt" },
  { value: "status_changed", label: "Status gewijzigd naar..." },
  { value: "callback_reminder", label: "Terugbelafspraak herinnering" },
  { value: "inactivity", label: "Inactiviteit" },
];

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: Record<string, any>;
  template_name: string;
  template_language: string;
  variable_mapping: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: { type: string; text?: string }[];
  parameter_format?: string;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("lead_created");
  const [formStatusId, setFormStatusId] = useState("");
  const [formHoursBefore, setFormHoursBefore] = useState("2");
  const [formDaysInactive, setFormDaysInactive] = useState("7");
  const [formPipeline, setFormPipeline] = useState("");
  const [formCustomerType, setFormCustomerType] = useState("");
  const [formTemplateName, setFormTemplateName] = useState("");
  const [formTemplateLanguage, setFormTemplateLanguage] = useState("nl");
  const [formMapping, setFormMapping] = useState<Record<string, string>>({});

  // Reference data
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);

  useEffect(() => {
    fetchAutomations();
    fetchTemplates();
    fetchPipelineStages();
  }, []);

  const fetchAutomations = async () => {
    const { data, error } = await (supabase as any)
      .from("whatsapp_automations")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setAutomations(data as Automation[]);
    setLoading(false);
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", { body: { action: "list" } });
      if (!error && data?.templates) {
        setTemplates(data.templates.filter((t: any) => t.status === "APPROVED"));
      }
    } catch { /* ignore */ }
    setLoadingTemplates(false);
  };

  const fetchPipelineStages = async () => {
    const { data } = await supabase.from("pipeline_stages").select("id, name").order("position");
    if (data) setPipelineStages(data);
  };

  const getParamNames = (template: WhatsAppTemplate): string[] => {
    const body = template.components.find(c => c.type === "BODY");
    if (!body?.text) return [];
    const isNamed = template.parameter_format === "named";
    if (isNamed) {
      const matches = body.text.match(/\{\{([a-z_]+)\}\}/g);
      return matches ? matches.map(m => m.replace(/\{\{|\}\}/g, "")) : [];
    }
    const matches = body.text.match(/\{\{(\d+)\}\}/g);
    return matches ? matches.map(m => m.replace(/\{\{|\}\}/g, "")) : [];
  };

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormTriggerType("lead_created");
    setFormStatusId("");
    setFormHoursBefore("2");
    setFormDaysInactive("7");
    setFormPipeline("");
    setFormCustomerType("");
    setFormTemplateName("");
    setFormTemplateLanguage("nl");
    setFormMapping({});
    setShowDialog(true);
  };

  const openEdit = (auto: Automation) => {
    setEditing(auto);
    setFormName(auto.name);
    setFormTriggerType(auto.trigger_type);
    setFormStatusId(auto.trigger_config?.status_id || "");
    setFormHoursBefore(String(auto.trigger_config?.hours_before || "2"));
    setFormDaysInactive(String(auto.trigger_config?.days_inactive || "7"));
    setFormPipeline(auto.conditions?.pipeline || "");
    setFormCustomerType(auto.conditions?.customer_type || "");
    setFormTemplateName(auto.template_name);
    setFormTemplateLanguage(auto.template_language || "nl");
    setFormMapping(auto.variable_mapping || {});
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formTemplateName) {
      toast.error("Vul naam en template in");
      return;
    }
    setSaving(true);

    const triggerConfig: Record<string, any> = {};
    if (formTriggerType === "status_changed" && formStatusId) triggerConfig.status_id = formStatusId;
    if (formTriggerType === "callback_reminder") triggerConfig.hours_before = parseInt(formHoursBefore) || 2;
    if (formTriggerType === "inactivity") triggerConfig.days_inactive = parseInt(formDaysInactive) || 7;

    const conditions: Record<string, any> = {};
    if (formPipeline) conditions.pipeline = formPipeline;
    if (formCustomerType) conditions.customer_type = formCustomerType;

    const record = {
      name: formName.trim(),
      trigger_type: formTriggerType,
      trigger_config: triggerConfig,
      conditions,
      template_name: formTemplateName,
      template_language: formTemplateLanguage,
      variable_mapping: formMapping,
    };

    try {
      if (editing) {
        const { error } = await (supabase as any).from("whatsapp_automations").update(record).eq("id", editing.id);
        if (error) throw error;
        toast.success("Automatisering bijgewerkt");
      } else {
        const { error } = await (supabase as any).from("whatsapp_automations").insert(record);
        if (error) throw error;
        toast.success("Automatisering aangemaakt");
      }
      setShowDialog(false);
      fetchAutomations();
    } catch (err: any) {
      toast.error(err.message || "Opslaan mislukt");
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from("whatsapp_automations").update({ is_active: active }).eq("id", id);
    if (error) {
      toast.error("Schakelen mislukt");
    } else {
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: active } : a));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("whatsapp_automations").delete().eq("id", id);
    if (error) {
      toast.error("Verwijderen mislukt");
    } else {
      setAutomations(prev => prev.filter(a => a.id !== id));
      toast.success("Automatisering verwijderd");
    }
  };

  const triggerLabel = (type: string) => TRIGGER_TYPES.find(t => t.value === type)?.label || type;

  const selectedTemplate = templates.find(t => t.name === formTemplateName);
  const paramNames = selectedTemplate ? getParamNames(selectedTemplate) : [];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-erp-text3" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-erp-text0">Automatiseringen</h3>
          <p className="text-[11px] text-erp-text3 mt-0.5">Stuur automatisch WhatsApp berichten bij CRM events</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium text-white bg-primary">
          <Plus className="w-3.5 h-3.5" /> Nieuw
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="w-10 h-10 mx-auto mb-3 text-erp-text3 opacity-20" />
          <p className="text-[13px] text-erp-text2 mb-1">Geen automatiseringen</p>
          <p className="text-[11px] text-erp-text3">Maak een automatisering aan om WhatsApp berichten automatisch te versturen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map(auto => (
            <div key={auto.id} className="bg-erp-bg2 border border-erp-border0 rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {auto.is_active ? (
                    <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-erp-text3 shrink-0" />
                  )}
                  <span className="text-[13px] font-medium text-erp-text0 truncate">{auto.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-erp-text3">
                  <span>{triggerLabel(auto.trigger_type)}</span>
                  <span>·</span>
                  <span>{auto.template_name}</span>
                </div>
              </div>
              <Switch
                checked={auto.is_active}
                onCheckedChange={(checked) => handleToggle(auto.id, checked)}
              />
              <button onClick={() => openEdit(auto)} className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center text-erp-text2">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Automatisering verwijderen?</AlertDialogTitle>
                    <AlertDialogDescription>"{auto.name}" wordt permanent verwijderd.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(auto.id)}>Verwijderen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Automatisering bewerken" : "Nieuwe automatisering"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naam</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Bijv. Welkomstbericht nieuwe lead" />
            </div>

            <div>
              <Label>Trigger</Label>
              <Select value={formTriggerType} onValueChange={setFormTriggerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formTriggerType === "status_changed" && (
              <div>
                <Label>Naar stage</Label>
                <Select value={formStatusId} onValueChange={setFormStatusId}>
                  <SelectTrigger><SelectValue placeholder="Kies een stage" /></SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formTriggerType === "callback_reminder" && (
              <div>
                <Label>Uren voor afspraak</Label>
                <Input type="number" min="1" value={formHoursBefore} onChange={e => setFormHoursBefore(e.target.value)} />
              </div>
            )}

            {formTriggerType === "inactivity" && (
              <div>
                <Label>Dagen inactief</Label>
                <Input type="number" min="1" value={formDaysInactive} onChange={e => setFormDaysInactive(e.target.value)} />
              </div>
            )}

            {/* Template */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Template</p>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Templates laden...
                </div>
              ) : (
                <Select value={formTemplateName} onValueChange={(val) => {
                  setFormTemplateName(val);
                  const tpl = templates.find(t => t.name === val);
                  if (tpl) {
                    setFormTemplateLanguage(tpl.language);
                    const params = getParamNames(tpl);
                    const newMapping: Record<string, string> = {};
                    params.forEach(p => { newMapping[p] = formMapping[p] || ""; });
                    setFormMapping(newMapping);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Kies een template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name} ({t.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Variable mapping */}
            {paramNames.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Variabelen koppelen</p>
                <div className="space-y-2">
                  {paramNames.map(param => (
                    <div key={param} className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded min-w-[80px]">{`{{${param}}}`}</span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Select value={formMapping[param] || ""} onValueChange={val => setFormMapping(prev => ({ ...prev, [param]: val }))}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Kies veld" /></SelectTrigger>
                        <SelectContent>
                          {CRM_FIELDS.map(f => (
                            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
