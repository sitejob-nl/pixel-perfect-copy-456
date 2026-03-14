import { useState, useRef, useEffect } from "react";
import { Paperclip, LayoutGrid, List, Link2, FileText, Smile, Image, File, X, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  phoneNumber: string;
  contactId: string | null;
  onSending?: () => void;
  onSent?: () => void;
}

const EMOJI_GRID = ["😀","😂","❤️","👍","🎉","🔥","😍","🤔","👏","💪","✅","⭐","🙏","💯","😊","🎯","📌","💡","🚀","👋"];

async function invokeWhatsApp(action: string, body: any) {
  const res = await supabase.functions.invoke("whatsapp-send", {
    body: { action, ...body },
  });
  if (res.error) throw res.error;
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export default function ChatToolbar({ phoneNumber, contactId, onSending, onSent }: Props) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [buttonsOpen, setButtonsOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [ctaOpen, setCtaOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const iconBtn = "w-8 h-8 rounded-lg hover:bg-erp-bg3 flex items-center justify-center text-erp-text2 transition-colors";

  return (
    <div className="flex items-center gap-0.5 px-1">
      <Popover open={attachOpen} onOpenChange={setAttachOpen}>
        <PopoverTrigger asChild>
          <Tooltip><TooltipTrigger asChild>
            <button className={iconBtn}><Paperclip className="w-4 h-4" /></button>
          </TooltipTrigger><TooltipContent>Bijlage</TooltipContent></Tooltip>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-erp-bg2 border-erp-border0" align="start">
          <AttachmentPopover phone={phoneNumber} contactId={contactId} onClose={() => setAttachOpen(false)} onSending={onSending} onSent={onSent} />
        </PopoverContent>
      </Popover>

      <Tooltip><TooltipTrigger asChild>
        <button className={iconBtn} onClick={() => setButtonsOpen(true)}><LayoutGrid className="w-4 h-4" /></button>
      </TooltipTrigger><TooltipContent>Knoppen</TooltipContent></Tooltip>
      <ButtonsSheet open={buttonsOpen} onOpenChange={setButtonsOpen} phone={phoneNumber} contactId={contactId} onSending={onSending} onSent={onSent} />

      <Tooltip><TooltipTrigger asChild>
        <button className={iconBtn} onClick={() => setListOpen(true)}><List className="w-4 h-4" /></button>
      </TooltipTrigger><TooltipContent>Lijst</TooltipContent></Tooltip>
      <ListSheet open={listOpen} onOpenChange={setListOpen} phone={phoneNumber} contactId={contactId} onSending={onSending} onSent={onSent} />

      <Popover open={ctaOpen} onOpenChange={setCtaOpen}>
        <PopoverTrigger asChild>
          <Tooltip><TooltipTrigger asChild>
            <button className={iconBtn}><Link2 className="w-4 h-4" /></button>
          </TooltipTrigger><TooltipContent>Link</TooltipContent></Tooltip>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 bg-erp-bg2 border-erp-border0" align="start">
          <CtaPopover phone={phoneNumber} contactId={contactId} onClose={() => setCtaOpen(false)} onSending={onSending} onSent={onSent} />
        </PopoverContent>
      </Popover>

      <Tooltip><TooltipTrigger asChild>
        <button className={iconBtn} onClick={() => setTemplateOpen(true)}><FileText className="w-4 h-4" /></button>
      </TooltipTrigger><TooltipContent>Template</TooltipContent></Tooltip>
      <TemplateSheet open={templateOpen} onOpenChange={setTemplateOpen} phone={phoneNumber} contactId={contactId} onSending={onSending} onSent={onSent} />

      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
        <PopoverTrigger asChild>
          <Tooltip><TooltipTrigger asChild>
            <button className={iconBtn}><Smile className="w-4 h-4" /></button>
          </TooltipTrigger><TooltipContent>Emoji</TooltipContent></Tooltip>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 bg-erp-bg2 border-erp-border0" align="start">
          <div className="grid grid-cols-5 gap-1">
            {EMOJI_GRID.map((e) => (
              <button key={e} className="w-10 h-10 rounded-lg hover:bg-erp-bg3 flex items-center justify-center text-lg transition-colors" onClick={() => {
                window.dispatchEvent(new CustomEvent("wa-insert-emoji", { detail: e }));
                setEmojiOpen(false);
              }}>{e}</button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Attachment Popover ──────────────────
function AttachmentPopover({ phone, contactId, onClose, onSending, onSent }: { phone: string; contactId: string | null; onClose: () => void; onSending?: () => void; onSent?: () => void }) {
  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "document">("image");
  const [sending, setSending] = useState(false);

  const handleFileSelect = (file: File, type: "image" | "document") => {
    setSelectedFile(file);
    setFileType(type);
  };

  const handleSend = async () => {
    if (!selectedFile) return;
    setSending(true);
    onSending?.();
    try {
      const path = `whatsapp-media/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("org-assets").upload(path, selectedFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("org-assets").getPublicUrl(path);
      const url = urlData.publicUrl;

      if (fileType === "image") {
        await invokeWhatsApp("send_image", { to: phone, image_url: url, caption: caption || undefined, contact_id: contactId || undefined });
      } else {
        await invokeWhatsApp("send_document", { to: phone, document_url: url, filename: selectedFile.name, caption: caption || undefined, contact_id: contactId || undefined });
      }
      toast.success("Verzonden");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Versturen mislukt");
    } finally {
      setSending(false);
      onSent?.();
    }
  };

  if (selectedFile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[12px] text-erp-text0">
          {fileType === "image" ? <Image className="w-4 h-4" /> : <File className="w-4 h-4" />}
          <span className="truncate flex-1">{selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} className="text-erp-text3 hover:text-erp-text1"><X className="w-3.5 h-3.5" /></button>
        </div>
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Bijschrift (optioneel)" className="text-[12px] bg-erp-bg3 border-erp-border0 h-8" />
        <button onClick={handleSend} disabled={sending} className="w-full h-8 rounded-lg text-[12px] font-medium text-white disabled:opacity-40 bg-primary">
          {sending ? "Versturen..." : "Versturen"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "image")} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "document")} />
      <button onClick={() => imgRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-erp-bg3 text-[13px] text-erp-text0 transition-colors">
        <Image className="w-4 h-4 text-erp-text2" /> Afbeelding verzenden
      </button>
      <button onClick={() => docRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-erp-bg3 text-[13px] text-erp-text0 transition-colors">
        <File className="w-4 h-4 text-erp-text2" /> Document verzenden
      </button>
    </div>
  );
}

// ─── Buttons Sheet ──────────────────
function ButtonsSheet({ open, onOpenChange, phone, contactId, onSending, onSent }: { open: boolean; onOpenChange: (v: boolean) => void; phone: string; contactId: string | null; onSending?: () => void; onSent?: () => void }) {
  const [bodyText, setBodyText] = useState("");
  const [buttons, setButtons] = useState([{ id: "btn_1", title: "" }]);
  const [sending, setSending] = useState(false);

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { id: `btn_${buttons.length + 1}`, title: "" }]);
  };

  const removeButton = (idx: number) => setButtons(buttons.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!bodyText.trim() || buttons.some(b => !b.title.trim())) return;
    setSending(true);
    onSending?.();
    try {
      await invokeWhatsApp("send_buttons", {
        to: phone, body_text: bodyText.trim(), buttons: buttons.map(b => ({ id: b.id, title: b.title.trim() })), contact_id: contactId || undefined,
      });
      toast.success("Knoppen bericht verzonden");
      setBodyText(""); setButtons([{ id: "btn_1", title: "" }]);
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message || "Versturen mislukt"); }
    finally { setSending(false); onSent?.(); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[420px]">
        <SheetHeader><SheetTitle className="text-erp-text0 text-[15px]">Reply Buttons</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-erp-text2 text-[12px]">Berichttekst *</Label>
            <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} maxLength={1024} rows={3} className="text-[13px] bg-erp-bg3 border-erp-border0" placeholder="Typ je bericht..." />
            <span className="text-[10px] text-erp-text3">{bodyText.length}/1024</span>
          </div>
          <div className="space-y-2">
            <Label className="text-erp-text2 text-[12px]">Knoppen (max 3)</Label>
            {buttons.map((btn, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={btn.title} onChange={(e) => { const b = [...buttons]; b[i].title = e.target.value; setButtons(b); }} maxLength={20} placeholder={`Knop ${i + 1}`} className="text-[13px] bg-erp-bg3 border-erp-border0 h-8 flex-1" />
                {buttons.length > 1 && <button onClick={() => removeButton(i)} className="text-erp-text3 hover:text-destructive"><X className="w-4 h-4" /></button>}
              </div>
            ))}
            {buttons.length < 3 && (
              <button onClick={addButton} className="text-[12px] text-primary hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Knop toevoegen</button>
            )}
          </div>
          <button onClick={handleSend} disabled={sending || !bodyText.trim() || buttons.some(b => !b.title.trim())} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 bg-primary">
            {sending ? "Versturen..." : "Versturen"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── List Sheet ──────────────────
function ListSheet({ open, onOpenChange, phone, contactId, onSending, onSent }: { open: boolean; onOpenChange: (v: boolean) => void; phone: string; contactId: string | null; onSending?: () => void; onSent?: () => void }) {
  const [bodyText, setBodyText] = useState("");
  const [buttonText, setButtonText] = useState("Opties");
  const [sections, setSections] = useState([{ title: "", rows: [{ id: "row_1", title: "", description: "" }] }]);
  const [sending, setSending] = useState(false);

  const totalRows = sections.reduce((s, sec) => s + sec.rows.length, 0);

  const addRow = (secIdx: number) => {
    if (totalRows >= 10) return;
    const s = [...sections];
    s[secIdx].rows.push({ id: `row_${totalRows + 1}`, title: "", description: "" });
    setSections(s);
  };

  const addSection = () => {
    setSections([...sections, { title: "", rows: [{ id: `row_${totalRows + 1}`, title: "", description: "" }] }]);
  };

  const handleSend = async () => {
    if (!bodyText.trim()) return;
    setSending(true);
    onSending?.();
    try {
      await invokeWhatsApp("send_list", {
        to: phone, body_text: bodyText.trim(), button_text: buttonText.trim() || "Opties",
        sections: sections.map(s => ({ title: s.title, rows: s.rows.map(r => ({ id: r.id, title: r.title, description: r.description || undefined })) })),
        contact_id: contactId || undefined,
      });
      toast.success("Lijst bericht verzonden");
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message || "Versturen mislukt"); }
    finally { setSending(false); onSent?.(); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[480px] overflow-y-auto">
        <SheetHeader><SheetTitle className="text-erp-text0 text-[15px]">Lijst bericht</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-erp-text2 text-[12px]">Berichttekst *</Label>
            <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={3} className="text-[13px] bg-erp-bg3 border-erp-border0" />
          </div>
          <div className="space-y-1">
            <Label className="text-erp-text2 text-[12px]">Knop tekst (max 20)</Label>
            <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={20} className="text-[13px] bg-erp-bg3 border-erp-border0 h-8" />
          </div>
          {sections.map((sec, si) => (
            <div key={si} className="bg-erp-bg3 rounded-lg p-3 space-y-2">
              <Input value={sec.title} onChange={(e) => { const s = [...sections]; s[si].title = e.target.value; setSections(s); }} maxLength={24} placeholder={`Sectie ${si + 1} titel`} className="text-[13px] bg-erp-bg2 border-erp-border0 h-8" />
              {sec.rows.map((row, ri) => (
                <div key={ri} className="flex gap-2">
                  <Input value={row.title} onChange={(e) => { const s = [...sections]; s[si].rows[ri].title = e.target.value; setSections(s); }} maxLength={24} placeholder="Titel" className="text-[12px] bg-erp-bg2 border-erp-border0 h-7 flex-1" />
                  <Input value={row.description} onChange={(e) => { const s = [...sections]; s[si].rows[ri].description = e.target.value; setSections(s); }} maxLength={72} placeholder="Beschrijving" className="text-[12px] bg-erp-bg2 border-erp-border0 h-7 flex-1" />
                </div>
              ))}
              {totalRows < 10 && (
                <button onClick={() => addRow(si)} className="text-[11px] text-primary hover:underline">+ Rij toevoegen</button>
              )}
            </div>
          ))}
          <button onClick={addSection} className="text-[12px] text-primary hover:underline">+ Sectie toevoegen</button>
          <span className="text-[10px] text-erp-text3 block">{totalRows}/10 rijen</span>
          <button onClick={handleSend} disabled={sending || !bodyText.trim()} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 bg-primary">
            {sending ? "Versturen..." : "Versturen"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── CTA URL Popover ──────────────────
function CtaPopover({ phone, contactId, onClose, onSending, onSent }: { phone: string; contactId: string | null; onClose: () => void; onSending?: () => void; onSent?: () => void }) {
  const [bodyText, setBodyText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!bodyText.trim() || !buttonText.trim() || !url.trim()) return;
    setSending(true);
    onSending?.();
    try {
      await invokeWhatsApp("send_cta_url", { to: phone, body_text: bodyText.trim(), button_text: buttonText.trim(), button_url: url.trim(), contact_id: contactId || undefined });
      toast.success("Link bericht verzonden");
      onClose();
    } catch (err: any) { toast.error(err.message || "Versturen mislukt"); }
    finally { setSending(false); onSent?.(); }
  };

  return (
    <div className="space-y-2">
      <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="Berichttekst *" rows={2} className="text-[12px] bg-erp-bg3 border-erp-border0" />
      <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={20} placeholder="Knop tekst *" className="text-[12px] bg-erp-bg3 border-erp-border0 h-8" />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://..." className="text-[12px] bg-erp-bg3 border-erp-border0 h-8" />
      <button onClick={handleSend} disabled={sending || !bodyText.trim() || !buttonText.trim() || !url.trim()} className="w-full h-8 rounded-lg text-[12px] font-medium text-white disabled:opacity-40 bg-primary">
        {sending ? "Versturen..." : "Versturen"}
      </button>
    </div>
  );
}

// ─── Database field mapping options ──────────────────
const DB_FIELD_OPTIONS = [
  { group: "Contact", fields: [
    { value: "contact.first_name", label: "Voornaam" },
    { value: "contact.last_name", label: "Achternaam" },
    { value: "contact.email", label: "Email" },
    { value: "contact.phone", label: "Telefoon" },
    { value: "contact.mobile", label: "Mobiel" },
    { value: "contact.job_title", label: "Functie" },
  ]},
  { group: "Bedrijf", fields: [
    { value: "company.name", label: "Bedrijfsnaam" },
    { value: "company.email", label: "Bedrijf email" },
    { value: "company.phone", label: "Bedrijf telefoon" },
    { value: "company.website", label: "Website" },
    { value: "company.city", label: "Plaats" },
  ]},
  { group: "Deal", fields: [
    { value: "deal.title", label: "Deal titel" },
    { value: "deal.value", label: "Deal waarde" },
  ]},
  { group: "Handmatig", fields: [
    { value: "_manual", label: "Handmatig invullen" },
  ]},
];

// ─── Template Sheet with Variable Mapping ──────────────────
export function TemplateSheet({ open, onOpenChange, phone, contactId, onSending, onSent }: { open: boolean; onOpenChange: (v: boolean) => void; phone: string; contactId: string | null; onSending?: () => void; onSent?: () => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [varMappings, setVarMappings] = useState<Record<string, { source: string; manual: string }>>({});
  const [contactData, setContactData] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-templates", { body: { action: "list", status: "APPROVED" } });
      if (res.data?.templates) setTemplates(res.data.templates);
    } catch {} finally { setLoading(false); }
  };

  const loadContactData = async () => {
    if (!contactId) return;
    try {
      const { data: contact } = await supabase
        .from("contacts")
        .select("*, companies(*), deals(*)")
        .eq("id", contactId)
        .single();
      setContactData(contact);
    } catch {}
  };

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) { loadTemplates(); loadContactData(); setSelected(null); setVarMappings({}); setSearch(""); }
  };

  const extractVars = (tpl: any): string[] => {
    const vars: string[] = [];
    for (const comp of (tpl.components || [])) {
      if (comp.text) {
        const matches = comp.text.match(/\{\{([^}]+)\}\}/g) || [];
        matches.forEach((m: string) => {
          const v = m.replace(/\{\{|\}\}/g, "").trim();
          if (!vars.includes(v)) vars.push(v);
        });
      }
    }
    return vars;
  };

  const selectTemplate = (tpl: any) => {
    setSelected(tpl);
    const vars = extractVars(tpl);
    const mappings: Record<string, { source: string; manual: string }> = {};
    vars.forEach(v => {
      // Auto-map common variable names
      const autoMap = autoMapVariable(v);
      mappings[v] = { source: autoMap || "_manual", manual: "" };
    });
    setVarMappings(mappings);
  };

  const autoMapVariable = (varName: string): string | null => {
    const lower = varName.toLowerCase();
    if (lower === "1" || lower === "first_name" || lower === "voornaam" || lower === "name" || lower === "naam") return "contact.first_name";
    if (lower === "last_name" || lower === "achternaam") return "contact.last_name";
    if (lower === "email") return "contact.email";
    if (lower === "phone" || lower === "telefoon") return "contact.phone";
    if (lower === "company" || lower === "bedrijf" || lower === "company_name") return "company.name";
    if (lower === "deal" || lower === "deal_title") return "deal.title";
    return null;
  };

  const resolveValue = (source: string, manual: string): string => {
    if (source === "_manual") return manual;
    if (!contactData) return manual;

    const [entity, field] = source.split(".");
    if (entity === "contact") return contactData?.[field] || "";
    if (entity === "company") return contactData?.companies?.[field] || "";
    if (entity === "deal") {
      const deals = contactData?.deals;
      if (Array.isArray(deals) && deals.length > 0) return deals[0]?.[field] || "";
      return "";
    }
    return manual;
  };

  const handleSend = async () => {
    if (!selected) return;
    const vars = extractVars(selected);
    const resolvedParams = vars.map(v => {
      const mapping = varMappings[v];
      return resolveValue(mapping?.source || "_manual", mapping?.manual || "");
    });

    // Check all params are filled
    if (resolvedParams.some(p => !p.trim())) {
      toast.error("Vul alle variabelen in");
      return;
    }

    setSending(true);
    onSending?.();
    try {
      // Build template_params for Meta API
      const paramFormat = selected.parameter_format || "positional";
      let templateComponents: any[] = [];

      // Check if there are header variables
      const headerComp = selected.components?.find((c: any) => c.type === "HEADER");
      const bodyComp = selected.components?.find((c: any) => c.type === "BODY");
      const headerVars = headerComp?.text ? (headerComp.text.match(/\{\{([^}]+)\}\}/g) || []) : [];
      const bodyVars = bodyComp?.text ? (bodyComp.text.match(/\{\{([^}]+)\}\}/g) || []) : [];

      let paramIdx = 0;

      if (headerVars.length > 0) {
        const headerParams = headerVars.map(() => {
          const val = resolvedParams[paramIdx++];
          return paramFormat === "named"
            ? { type: "text", parameter_name: vars[paramIdx - 1], text: val }
            : { type: "text", text: val };
        });
        templateComponents.push({ type: "header", parameters: headerParams });
      }

      if (bodyVars.length > 0) {
        const bodyParams = bodyVars.map(() => {
          const val = resolvedParams[paramIdx++];
          return paramFormat === "named"
            ? { type: "text", parameter_name: vars[paramIdx - 1], text: val }
            : { type: "text", text: val };
        });
        templateComponents.push({ type: "body", parameters: bodyParams });
      }

      const sendBody: any = {
        to: phone,
        message_type: "template",
        template_name: selected.name,
        contact_id: contactId || undefined,
        template_language: selected.language,
      };
      if (templateComponents.length > 0) {
        sendBody.template_params = templateComponents;
      }

      await invokeWhatsApp("send_message", sendBody);
      toast.success("Template verzonden");
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message || "Versturen mislukt"); }
    finally { setSending(false); onSent?.(); }
  };

  const filteredTemplates = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const vars = selected ? extractVars(selected) : [];

  // Preview: replace variables with resolved values
  const getPreviewText = (text: string) => {
    let result = text;
    for (const v of vars) {
      const mapping = varMappings[v];
      const val = resolveValue(mapping?.source || "_manual", mapping?.manual || "");
      result = result.replace(`{{${v}}}`, val ? `[${val}]` : `{{${v}}}`);
    }
    return result;
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[480px] overflow-y-auto">
        <SheetHeader><SheetTitle className="text-erp-text0 text-[15px]">Template verzenden</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {!selected ? (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek template..."
                className="text-[13px] bg-erp-bg3 border-erp-border0 h-8"
              />
              {loading ? (
                <p className="text-[13px] text-erp-text3">Templates laden...</p>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-erp-text3 opacity-30" />
                  <p className="text-[13px] text-erp-text3">Geen goedgekeurde templates gevonden</p>
                  <p className="text-[11px] text-erp-text3 mt-1">Templates moeten goedgekeurd zijn door Meta</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((tpl) => {
                    const bodyText = tpl.components?.find((c: any) => c.type === "BODY")?.text;
                    return (
                      <button key={tpl.id || tpl.name} onClick={() => selectTemplate(tpl)} className="w-full text-left p-3 rounded-lg hover:bg-erp-bg3 border border-erp-border0 transition-colors">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[13px] font-medium text-erp-text0">{tpl.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-erp-bg3 text-erp-text2">{tpl.language}</span>
                        </div>
                        {bodyText && (
                          <p className="text-[11px] text-erp-text2 line-clamp-2">{bodyText}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setSelected(null)} className="text-[12px] text-primary hover:underline">← Terug naar templates</button>

              {/* Template preview */}
              <div className="bg-erp-bg3 rounded-lg p-3 space-y-1">
                <p className="text-[13px] font-medium text-erp-text0">{selected.name}</p>
                {selected.components?.map((comp: any, i: number) => (
                  <div key={i}>
                    {comp.type === "HEADER" && comp.text && (
                      <p className="text-[12px] font-semibold text-erp-text0">{getPreviewText(comp.text)}</p>
                    )}
                    {comp.type === "BODY" && comp.text && (
                      <p className="text-[12px] text-erp-text1 whitespace-pre-wrap">{getPreviewText(comp.text)}</p>
                    )}
                    {comp.type === "FOOTER" && comp.text && (
                      <p className="text-[10px] text-erp-text3 mt-1">{comp.text}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Variable mapping */}
              {vars.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-erp-text2 text-[12px] font-medium">Variabelen koppelen</Label>
                  {!contactId && (
                    <p className="text-[10px] text-erp-amber bg-erp-amber/10 px-2 py-1 rounded">
                      Geen contact gekoppeld — alleen handmatige invoer beschikbaar
                    </p>
                  )}
                  {vars.map(v => {
                    const mapping = varMappings[v] || { source: "_manual", manual: "" };
                    const resolvedVal = resolveValue(mapping.source, mapping.manual);
                    return (
                      <div key={v} className="space-y-1.5 bg-erp-bg3/50 rounded-lg p-2.5 border border-erp-border0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-erp-text2">{`{{${v}}}`}</span>
                          {resolvedVal && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{resolvedVal}</span>
                          )}
                        </div>
                        <Select
                          value={mapping.source}
                          onValueChange={(val) => setVarMappings(prev => ({
                            ...prev,
                            [v]: { ...prev[v], source: val, manual: val === "_manual" ? prev[v]?.manual || "" : "" },
                          }))}
                        >
                          <SelectTrigger className="h-7 text-[12px] bg-erp-bg3 border-erp-border0">
                            <SelectValue placeholder="Kies bron..." />
                          </SelectTrigger>
                          <SelectContent className="bg-erp-bg2 border-erp-border0">
                            {DB_FIELD_OPTIONS.map(group => (
                              <div key={group.group}>
                                <div className="px-2 py-1 text-[10px] text-erp-text3 font-medium uppercase">{group.group}</div>
                                {group.fields.map(f => (
                                  <SelectItem
                                    key={f.value}
                                    value={f.value}
                                    className="text-[12px]"
                                    disabled={!contactId && f.value !== "_manual"}
                                  >
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        {mapping.source === "_manual" && (
                          <Input
                            value={mapping.manual}
                            onChange={(e) => setVarMappings(prev => ({
                              ...prev,
                              [v]: { ...prev[v], manual: e.target.value },
                            }))}
                            placeholder="Waarde invullen..."
                            className="h-7 text-[12px] bg-erp-bg3 border-erp-border0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button onClick={handleSend} disabled={sending} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 bg-primary">
                {sending ? "Versturen..." : "Template versturen"}
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
