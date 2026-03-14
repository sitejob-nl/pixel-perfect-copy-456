import { useState, useRef } from "react";
import { Paperclip, LayoutGrid, List, Link2, FileText, Smile, Image, File, X, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      {/* Attachment */}
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

      {/* Buttons */}
      <Tooltip><TooltipTrigger asChild>
        <button className={iconBtn} onClick={() => setButtonsOpen(true)}><LayoutGrid className="w-4 h-4" /></button>
      </TooltipTrigger><TooltipContent>Knoppen</TooltipContent></Tooltip>
      <ButtonsSheet open={buttonsOpen} onOpenChange={setButtonsOpen} phone={phoneNumber} contactId={contactId} onSending={onSending} onSent={onSent} />

      {/* List */}
      <Tooltip><TooltipTrigger asChild>
        <button className={iconBtn} onClick={() => setListOpen(true)}><List className="w-4 h-4" /></button>
      </TooltipTrigger><TooltipContent>Lijst</TooltipContent></Tooltip>
      <ListSheet open={listOpen} onOpenChange={setListOpen} phone={phoneNumber} contactId={contactId} onSending={onSending} onSent={onSent} />

      {/* CTA URL */}
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

      {/* Template */}
      <Tooltip><TooltipTrigger asChild>
        <button className={iconBtn} onClick={() => setTemplateOpen(true)}><FileText className="w-4 h-4" /></button>
      </TooltipTrigger><TooltipContent>Template</TooltipContent></Tooltip>
      <TemplateSheet open={templateOpen} onOpenChange={setTemplateOpen} phone={phoneNumber} contactId={contactId} onSending={onSending} onSent={onSent} />

      {/* Emoji */}
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
                // Insert emoji into the message input - we'll use a custom event
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
      const ext = selectedFile.name.split(".").pop();
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
        <button onClick={handleSend} disabled={sending} className="w-full h-8 rounded-lg text-[12px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(142, 50%, 30%)" }}>
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
                {buttons.length > 1 && <button onClick={() => removeButton(i)} className="text-erp-text3 hover:text-erp-red"><X className="w-4 h-4" /></button>}
              </div>
            ))}
            {buttons.length < 3 && (
              <button onClick={addButton} className="text-[12px] text-primary hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Knop toevoegen</button>
            )}
          </div>
          <button onClick={handleSend} disabled={sending || !bodyText.trim() || buttons.some(b => !b.title.trim())} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(142, 50%, 30%)" }}>
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
          <button onClick={handleSend} disabled={sending || !bodyText.trim()} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(142, 50%, 30%)" }}>
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
      <button onClick={handleSend} disabled={sending || !bodyText.trim() || !buttonText.trim() || !url.trim()} className="w-full h-8 rounded-lg text-[12px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(142, 50%, 30%)" }}>
        {sending ? "Versturen..." : "Versturen"}
      </button>
    </div>
  );
}

// ─── Template Sheet ──────────────────
function TemplateSheet({ open, onOpenChange, phone, contactId, onSending, onSent }: { open: boolean; onOpenChange: (v: boolean) => void; phone: string; contactId: string | null; onSending?: () => void; onSent?: () => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [params, setParams] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-templates", { body: { action: "list", status: "APPROVED" } });
      if (res.data?.templates) setTemplates(res.data.templates);
    } catch {} finally { setLoading(false); }
  };

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) { loadTemplates(); setSelected(null); setParams([]); }
  };

  const selectTemplate = (tpl: any) => {
    setSelected(tpl);
    // Parse variables from body
    const body = tpl.components?.find((c: any) => c.type === "BODY");
    if (body?.text) {
      const matches = body.text.match(/\{\{(\d+)\}\}/g) || [];
      setParams(new Array(matches.length).fill(""));
    }
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    onSending?.();
    try {
      const body: any = { to: phone, message_type: "template", template_name: selected.name, contact_id: contactId || undefined };
      if (params.length > 0) body.template_params = params;
      if (selected.language) body.template_language = selected.language;
      await invokeWhatsApp("send_message", body);
      toast.success("Template verzonden");
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message || "Versturen mislukt"); }
    finally { setSending(false); onSent?.(); }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[420px] overflow-y-auto">
        <SheetHeader><SheetTitle className="text-erp-text0 text-[15px]">Template verzenden</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {!selected ? (
            <>
              {loading ? (
                <p className="text-[13px] text-erp-text3">Laden...</p>
              ) : templates.length === 0 ? (
                <p className="text-[13px] text-erp-text3">Geen goedgekeurde templates gevonden</p>
              ) : (
                templates.map((tpl) => (
                  <button key={tpl.id || tpl.name} onClick={() => selectTemplate(tpl)} className="w-full text-left p-3 rounded-lg hover:bg-erp-bg3 border border-erp-border0 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-erp-text0">{tpl.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-erp-bg3 text-erp-text2">{tpl.category}</span>
                    </div>
                    <span className="text-[11px] text-erp-text3">{tpl.language}</span>
                  </button>
                ))
              )}
            </>
          ) : (
            <>
              <button onClick={() => setSelected(null)} className="text-[12px] text-primary hover:underline">← Terug</button>
              <div className="bg-erp-bg3 rounded-lg p-3">
                <p className="text-[13px] font-medium text-erp-text0 mb-1">{selected.name}</p>
                {selected.components?.find((c: any) => c.type === "BODY") && (
                  <p className="text-[12px] text-erp-text1 whitespace-pre-wrap">
                    {selected.components.find((c: any) => c.type === "BODY").text}
                  </p>
                )}
              </div>
              {params.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-erp-text2 text-[12px]">Variabelen invullen</Label>
                  {params.map((p, i) => (
                    <Input key={i} value={p} onChange={(e) => { const np = [...params]; np[i] = e.target.value; setParams(np); }} placeholder={`{{${i + 1}}}`} className="text-[13px] bg-erp-bg3 border-erp-border0 h-8" />
                  ))}
                </div>
              )}
              <button onClick={handleSend} disabled={sending} className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: "hsl(142, 50%, 30%)" }}>
                {sending ? "Versturen..." : "Template versturen"}
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
