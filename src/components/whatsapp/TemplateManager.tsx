import { useState, useEffect, useMemo } from "react";
import { FileText, Plus, Eye, Trash2, Search, Globe } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "APPROVED" | "PENDING" | "REJECTED";

async function invokeTemplates(action: string, body: any = {}) {
  const res = await supabase.functions.invoke("whatsapp-templates", { body: { action, ...body } });
  if (res.error) throw res.error;
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [viewSheet, setViewSheet] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [subTab, setSubTab] = useState<"templates" | "library">("templates");

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await invokeTemplates("list");
      setTemplates(data.templates || []);
    } catch {} finally { setLoading(false); }
  };

  const handleDelete = async (tpl: any) => {
    if (!confirm(`Template "${tpl.name}" verwijderen?`)) return;
    try {
      await invokeTemplates("delete", { name: tpl.name, template_id: tpl.id });
      toast.success("Template verwijderd");
      loadTemplates();
    } catch (err: any) { toast.error(err.message || "Verwijderen mislukt"); }
  };

  const statusCounts = {
    APPROVED: templates.filter(t => t.status === "APPROVED").length,
    PENDING: templates.filter(t => t.status === "PENDING").length,
    REJECTED: templates.filter(t => t.status === "REJECTED").length,
  };

  const filtered = templates.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "hsl(142, 70%, 45%)";
      case "PENDING": return "hsl(45, 90%, 50%)";
      case "REJECTED": return "hsl(0, 70%, 50%)";
      default: return "hsl(var(--erp-text-3))";
    }
  };

  const tabs: { key: "templates" | "library"; label: string }[] = [
    { key: "templates", label: "Templates" },
    { key: "library", label: "Bibliotheek" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setSubTab(tab.key)} className={cn(
            "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
            subTab === tab.key ? "bg-erp-bg2 text-erp-text0" : "text-erp-text3 hover:text-erp-text1"
          )}>{tab.label}</button>
        ))}
      </div>

      {subTab === "templates" ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button onClick={() => setFilter("all")} className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium", filter === "all" ? "bg-erp-bg2 text-erp-text0" : "text-erp-text3")}>Alle ({templates.length})</button>
              <button onClick={() => setFilter("APPROVED")} className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium", filter === "APPROVED" ? "bg-erp-bg2 text-erp-text0" : "text-erp-text3")}>Goedgekeurd ({statusCounts.APPROVED})</button>
              <button onClick={() => setFilter("PENDING")} className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium", filter === "PENDING" ? "bg-erp-bg2 text-erp-text0" : "text-erp-text3")}>In review ({statusCounts.PENDING})</button>
            </div>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium text-white bg-primary">
              <Plus className="w-3.5 h-3.5" /> Template aanmaken
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-erp-text3" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek template..." className="pl-8 h-8 text-[13px] bg-erp-bg3 border-erp-border0" />
          </div>

          {loading ? (
            <div className="text-[13px] text-erp-text3 py-4">Laden...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto mb-2 text-erp-text3 opacity-30" />
              <p className="text-[13px] text-erp-text3">Geen templates gevonden</p>
            </div>
          ) : (
            <div className="space-y-0 border border-erp-border0 rounded-lg overflow-hidden">
              {filtered.map((tpl) => (
                <div key={tpl.id || tpl.name} className="flex items-center gap-3 px-4 py-3 border-b border-erp-border0 last:border-0 hover:bg-erp-bg3/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-erp-text0">{tpl.name}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-erp-bg3 text-erp-text2">{tpl.category}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: statusColor(tpl.status), background: `${statusColor(tpl.status)}18` }}>
                    {tpl.status}
                  </span>
                  <span className="text-[11px] text-erp-text3 flex items-center gap-1"><Globe className="w-3 h-3" />{tpl.language}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewSheet(tpl)} className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center text-erp-text2"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(tpl)} className="w-7 h-7 rounded hover:bg-erp-bg3 flex items-center justify-center text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <TemplateLibrary onUse={() => { setCreateOpen(true); setSubTab("templates"); }} />
      )}

      {/* View Sheet */}
      <Sheet open={!!viewSheet} onOpenChange={(v) => !v && setViewSheet(null)}>
        <SheetContent className="bg-erp-bg2 border-erp-border0 w-[420px] overflow-y-auto">
          <SheetHeader><SheetTitle className="text-erp-text0 text-[15px]">Template: {viewSheet?.name}</SheetTitle></SheetHeader>
          {viewSheet && (
            <div className="mt-4 space-y-3">
              <div className="text-[11px] text-erp-text3 space-y-1">
                <p>ID: <span className="font-mono text-erp-text1">{viewSheet.id}</span></p>
                <p>Categorie: {viewSheet.category}</p>
                <p>Status: {viewSheet.status}</p>
                <p>Taal: {viewSheet.language}</p>
              </div>
              {viewSheet.components?.map((comp: any, i: number) => (
                <div key={i} className="bg-erp-bg3 rounded-lg p-3">
                  <p className="text-[10px] text-erp-text3 font-medium uppercase mb-1">{comp.type}</p>
                  {comp.text && <p className="text-[13px] text-erp-text0 whitespace-pre-wrap">{comp.text}</p>}
                  {comp.buttons && comp.buttons.map((btn: any, bi: number) => (
                    <div key={bi} className="mt-1 px-3 py-1.5 rounded border border-erp-border0 text-[12px] text-center text-erp-text1">{btn.text}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateTemplateSheet open={createOpen} onOpenChange={setCreateOpen} onCreated={loadTemplates} />
    </div>
  );
}

// ─── Create Template Sheet with Variable Examples ──────────────────
function CreateTemplateSheet({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("nl");
  const [paramFormat, setParamFormat] = useState<"positional" | "named">("positional");
  const [bodyText, setBodyText] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [useHeader, setUseHeader] = useState(false);
  const [useFooter, setUseFooter] = useState(false);
  const [saving, setSaving] = useState(false);

  // Example values for variables
  const [bodyExamples, setBodyExamples] = useState<Record<string, string>>({});
  const [headerExamples, setHeaderExamples] = useState<Record<string, string>>({});

  // Extract variables from text
  const extractVars = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "").trim()))];
  };

  const bodyVars = useMemo(() => extractVars(bodyText), [bodyText]);
  const headerVars = useMemo(() => extractVars(headerText), [headerText]);

  const allExamplesFilled = () => {
    for (const v of bodyVars) if (!bodyExamples[v]?.trim()) return false;
    for (const v of headerVars) if (!headerExamples[v]?.trim()) return false;
    return true;
  };

  const handleCreate = async () => {
    if (!name.trim() || !bodyText.trim()) return;
    if ((bodyVars.length > 0 || headerVars.length > 0) && !allExamplesFilled()) {
      toast.error("Vul voorbeeldwaarden in voor alle variabelen");
      return;
    }
    setSaving(true);
    try {
      const components: any[] = [];

      // Header
      if (useHeader && headerText.trim()) {
        const headerComp: any = { type: "HEADER", format: "TEXT", text: headerText.trim() };
        if (headerVars.length > 0) {
          if (paramFormat === "named") {
            headerComp.example = {
              header_text_named_params: headerVars.map(v => ({
                param_name: v,
                example: headerExamples[v] || "",
              })),
            };
          } else {
            headerComp.example = {
              header_text: headerVars.map(v => headerExamples[v] || ""),
            };
          }
        }
        components.push(headerComp);
      }

      // Body
      const bodyComp: any = { type: "BODY", text: bodyText.trim() };
      if (bodyVars.length > 0) {
        if (paramFormat === "named") {
          bodyComp.example = {
            body_text_named_params: bodyVars.map(v => ({
              param_name: v,
              example: bodyExamples[v] || "",
            })),
          };
        } else {
          bodyComp.example = {
            body_text: [bodyVars.map(v => bodyExamples[v] || "")],
          };
        }
      }
      components.push(bodyComp);

      // Footer
      if (useFooter && footerText.trim()) {
        components.push({ type: "FOOTER", text: footerText.trim() });
      }

      await invokeTemplates("create", {
        name: name.trim().toLowerCase().replace(/\s+/g, "_"),
        category,
        language,
        parameter_format: paramFormat,
        components,
      });
      toast.success("Template ingediend voor review");
      onOpenChange(false);
      onCreated();
      setName(""); setBodyText(""); setHeaderText(""); setFooterText("");
      setBodyExamples({}); setHeaderExamples({});
    } catch (err: any) { toast.error(err.message || "Aanmaken mislukt"); }
    finally { setSaving(false); }
  };

  const insertVariable = () => {
    if (paramFormat === "positional") {
      const nextNum = bodyVars.filter(v => /^\d+$/.test(v)).length + 1;
      setBodyText(prev => prev + `{{${nextNum}}}`);
    } else {
      const varName = prompt("Variabele naam (bijv. first_name):");
      if (varName) setBodyText(prev => prev + `{{${varName.trim().toLowerCase().replace(/\s+/g, "_")}}}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[500px] overflow-y-auto">
        <SheetHeader><SheetTitle className="text-erp-text0 text-[15px]">Template aanmaken</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label className="text-erp-text2 text-[12px]">Naam *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="bijv. welkom_bericht" className="text-[13px] bg-erp-bg3 border-erp-border0" />
            <span className="text-[10px] text-erp-text3">Alleen kleine letters en underscores</span>
          </div>

          {/* Category + Language + Format */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-erp-text2 text-[12px]">Categorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-[12px]">Taal</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="nl">🇳🇱 nl</SelectItem>
                  <SelectItem value="en_US">🇺🇸 en_US</SelectItem>
                  <SelectItem value="en">🇬🇧 en</SelectItem>
                  <SelectItem value="de">🇩🇪 de</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-[12px]">Variabelen</Label>
              <Select value={paramFormat} onValueChange={(v) => setParamFormat(v as any)}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="positional">Positioneel ({"{{1}}"})</SelectItem>
                  <SelectItem value="named">Benoemd ({"{{name}}"})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={useHeader} onChange={(e) => setUseHeader(e.target.checked)} className="rounded" />
            <Label className="text-erp-text2 text-[12px]">Header (optioneel)</Label>
          </div>
          {useHeader && (
            <div className="space-y-2">
              <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} maxLength={60} placeholder="Header tekst, bijv. Hoi {{1}}!" className="text-[13px] bg-erp-bg3 border-erp-border0" />
              {headerVars.length > 0 && (
                <VariableExamples vars={headerVars} examples={headerExamples} onChange={setHeaderExamples} label="Header" />
              )}
            </div>
          )}

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-erp-text2 text-[12px]">Body *</Label>
              <button onClick={insertVariable} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20">
                + Variabele toevoegen
              </button>
            </div>
            <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} maxLength={1024} rows={5} placeholder="Typ je template body... Gebruik {{1}} of {{naam}} voor variabelen" className="text-[13px] bg-erp-bg3 border-erp-border0" />
            <span className="text-[10px] text-erp-text3">{bodyText.length}/1024</span>
          </div>

          {/* Body variable examples */}
          {bodyVars.length > 0 && (
            <VariableExamples vars={bodyVars} examples={bodyExamples} onChange={setBodyExamples} label="Body" />
          )}

          {/* Footer */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={useFooter} onChange={(e) => setUseFooter(e.target.checked)} className="rounded" />
            <Label className="text-erp-text2 text-[12px]">Footer (optioneel)</Label>
          </div>
          {useFooter && (
            <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} maxLength={60} placeholder="Footer tekst" className="text-[13px] bg-erp-bg3 border-erp-border0" />
          )}

          {/* Preview */}
          {bodyText.trim() && (
            <div className="space-y-1">
              <Label className="text-erp-text2 text-[12px]">Voorbeeld</Label>
              <div className="bg-erp-bg3 rounded-lg p-3 border border-erp-border0">
                {useHeader && headerText && (
                  <p className="text-[12px] font-semibold text-erp-text0 mb-1">
                    {replaceVarsWithExamples(headerText, headerVars, headerExamples)}
                  </p>
                )}
                <p className="text-[13px] text-erp-text0 whitespace-pre-wrap">
                  {replaceVarsWithExamples(bodyText, bodyVars, bodyExamples)}
                </p>
                {useFooter && footerText && (
                  <p className="text-[11px] text-erp-text3 mt-1">{footerText}</p>
                )}
              </div>
            </div>
          )}

          <button onClick={handleCreate} disabled={saving || !name.trim() || !bodyText.trim()} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 bg-primary">
            {saving ? "Aanmaken..." : "Template aanmaken"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function replaceVarsWithExamples(text: string, vars: string[], examples: Record<string, string>): string {
  let result = text;
  for (const v of vars) {
    const example = examples[v]?.trim();
    result = result.replace(`{{${v}}}`, example ? `[${example}]` : `{{${v}}}`);
  }
  return result;
}

// ─── Variable Examples Component ──────────────────
function VariableExamples({ vars, examples, onChange, label }: {
  vars: string[];
  examples: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  label: string;
}) {
  return (
    <div className="bg-erp-bg3/50 rounded-lg p-3 border border-erp-border0 space-y-2">
      <p className="text-[11px] text-erp-text3 font-medium">{label} voorbeeldwaarden (vereist door Meta)</p>
      {vars.map(v => (
        <div key={v} className="flex items-center gap-2">
          <span className="text-[11px] text-erp-text2 font-mono min-w-[70px]">{`{{${v}}}`}</span>
          <Input
            value={examples[v] || ""}
            onChange={(e) => onChange({ ...examples, [v]: e.target.value })}
            placeholder={`Voorbeeld voor ${v}`}
            className="h-7 text-[12px] bg-erp-bg3 border-erp-border0 flex-1"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Template Library ──────────────────
function TemplateLibrary({ onUse }: { onUse: (tpl: any) => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadLibrary(); }, []);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const data = await invokeTemplates("browse_library", { search: search || undefined });
      setTemplates(data.templates || []);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-erp-text3" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadLibrary()} placeholder="Zoek in bibliotheek..." className="pl-8 h-8 text-[13px] bg-erp-bg3 border-erp-border0" />
      </div>
      {loading ? (
        <div className="text-[13px] text-erp-text3 py-4">Laden...</div>
      ) : templates.length === 0 ? (
        <div className="text-[13px] text-erp-text3 text-center py-8">Geen templates in bibliotheek</div>
      ) : (
        <div className="grid gap-2">
          {templates.map((tpl: any, i: number) => (
            <div key={i} className="border border-erp-border0 rounded-lg p-3 hover:bg-erp-bg3/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium text-erp-text0">{tpl.name}</span>
                <button onClick={() => onUse(tpl)} className="text-[11px] text-primary font-medium hover:underline">Gebruiken</button>
              </div>
              {tpl.components?.find((c: any) => c.type === "BODY") && (
                <p className="text-[11px] text-erp-text2 line-clamp-2">{tpl.components.find((c: any) => c.type === "BODY").text}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
