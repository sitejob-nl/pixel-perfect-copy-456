import type { Block, DesignSettings } from "./generateHtml";
import MergeFieldInserter from "./MergeFieldInserter";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  block: Block | null;
  settings: DesignSettings;
  onUpdateBlock: (data: Record<string, any>) => void;
  onUpdateSettings: (s: Partial<DesignSettings>) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium text-erp-text2 mb-1">{children}</label>;
}

function TextAreaWithMerge({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <MergeFieldInserter onInsert={(f) => {
          const el = ref.current;
          if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const newVal = value.slice(0, start) + f + value.slice(end);
            onChange(newVal);
            setTimeout(() => { el.selectionStart = el.selectionEnd = start + f.length; el.focus(); }, 0);
          } else {
            onChange(value + f);
          }
        }} />
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[12px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none"
      />
    </div>
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2 items-center">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-erp-bg2 border border-erp-border0 rounded px-2 py-1 text-[11px] text-erp-text0 font-mono" />
      </div>
    </div>
  );
}

function AlignSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>Uitlijning</FieldLabel>
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <button key={a} onClick={() => onChange(a)} className={`flex-1 py-1.5 rounded text-[11px] font-medium ${value === a ? "bg-erp-blue text-white" : "bg-erp-bg2 border border-erp-border0 text-erp-text2 hover:bg-erp-hover"}`}>
            {a === "left" ? "Links" : a === "center" ? "Midden" : "Rechts"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BlockSettings({ block, settings, onUpdateBlock, onUpdateSettings }: Props) {
  const d = block?.data || {};
  const update = (key: string, val: any) => onUpdateBlock({ ...d, [key]: val });

  return (
    <div className="w-[260px] min-w-[260px] bg-erp-bg1 border-l border-erp-border0 p-3 overflow-y-auto">
      {/* Global settings */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 mb-2">Globale instellingen</div>
        <div className="space-y-2">
          <ColorInput label="Achtergrondkleur" value={settings.backgroundColor} onChange={(v) => onUpdateSettings({ backgroundColor: v })} />
          <div>
            <FieldLabel>Content breedte</FieldLabel>
            <select value={settings.contentWidth} onChange={(e) => onUpdateSettings({ contentWidth: Number(e.target.value) })} className="w-full bg-erp-bg2 border border-erp-border0 rounded px-2 py-1.5 text-[12px] text-erp-text0">
              <option value={560}>560px</option>
              <option value={600}>600px</option>
              <option value={640}>640px</option>
            </select>
          </div>
          <div>
            <FieldLabel>Font</FieldLabel>
            <select value={settings.fontFamily} onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })} className="w-full bg-erp-bg2 border border-erp-border0 rounded px-2 py-1.5 text-[12px] text-erp-text0">
              {["Arial, sans-serif", "Helvetica, sans-serif", "Georgia, serif", "Verdana, sans-serif"].map(f => <option key={f} value={f}>{f.split(",")[0]}</option>)}
            </select>
          </div>
          <ColorInput label="Accent kleur" value={settings.accentColor} onChange={(v) => onUpdateSettings({ accentColor: v })} />
        </div>
      </div>

      {!block && (
        <div className="text-center text-[12px] text-erp-text3 mt-8">Selecteer een blok om te bewerken</div>
      )}

      {block && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 mb-2">
            {block.type.charAt(0).toUpperCase() + block.type.slice(1)} instellingen
          </div>
          <div className="space-y-3">
            {block.type === "header" && (
              <>
                <div><FieldLabel>Tekst</FieldLabel><TextAreaWithMerge value={d.text || ""} onChange={(v) => update("text", v)} rows={2} /></div>
                <div>
                  <FieldLabel>Niveau</FieldLabel>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => update("level", n)} className={`flex-1 py-1.5 rounded text-[12px] font-bold ${d.level === n ? "bg-erp-blue text-white" : "bg-erp-bg2 border border-erp-border0 text-erp-text2"}`}>H{n}</button>
                    ))}
                  </div>
                </div>
                <AlignSelect value={d.align || "center"} onChange={(v) => update("align", v)} />
                <ColorInput label="Kleur" value={d.color || "#1a1a1a"} onChange={(v) => update("color", v)} />
              </>
            )}
            {block.type === "text" && (
              <>
                <div><FieldLabel>Tekst</FieldLabel><TextAreaWithMerge value={d.text || ""} onChange={(v) => update("text", v)} rows={4} /></div>
                <AlignSelect value={d.align || "left"} onChange={(v) => update("align", v)} />
                <div>
                  <FieldLabel>Tekstgrootte</FieldLabel>
                  <div className="flex gap-1">
                    {(["small", "normal", "large"] as const).map(s => (
                      <button key={s} onClick={() => update("fontSize", s)} className={`flex-1 py-1.5 rounded text-[11px] ${(d.fontSize || "normal") === s ? "bg-erp-blue text-white" : "bg-erp-bg2 border border-erp-border0 text-erp-text2"}`}>{s === "small" ? "Klein" : s === "normal" ? "Normaal" : "Groot"}</button>
                    ))}
                  </div>
                </div>
                <ColorInput label="Kleur" value={d.color || "#374151"} onChange={(v) => update("color", v)} />
              </>
            )}
            {block.type === "image" && (
              <>
                <div><FieldLabel>Afbeelding URL</FieldLabel><input type="text" value={d.src || ""} onChange={(e) => update("src", e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded px-2 py-1.5 text-[12px] text-erp-text0" placeholder="https://..." /></div>
                <div><FieldLabel>Alt tekst</FieldLabel><input type="text" value={d.alt || ""} onChange={(e) => update("alt", e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded px-2 py-1.5 text-[12px] text-erp-text0" /></div>
                <div>
                  <FieldLabel>Breedte: {d.width || "100%"}</FieldLabel>
                  <input type="range" min={50} max={100} value={parseInt(d.width) || 100} onChange={(e) => update("width", `${e.target.value}%`)} className="w-full" />
                </div>
                <div><FieldLabel>Link URL</FieldLabel><input type="text" value={d.url || ""} onChange={(e) => update("url", e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded px-2 py-1.5 text-[12px] text-erp-text0" placeholder="Optioneel" /></div>
                <AlignSelect value={d.align || "center"} onChange={(v) => update("align", v)} />
              </>
            )}
            {block.type === "button" && (
              <>
                <div><FieldLabel>Tekst</FieldLabel><input type="text" value={d.text || ""} onChange={(e) => update("text", e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded px-2 py-1.5 text-[12px] text-erp-text0" /></div>
                <div><FieldLabel>URL</FieldLabel><input type="text" value={d.url || ""} onChange={(e) => update("url", e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded px-2 py-1.5 text-[12px] text-erp-text0" /></div>
                <ColorInput label="Achtergrondkleur" value={d.color || settings.accentColor} onChange={(v) => update("color", v)} />
                <ColorInput label="Tekstkleur" value={d.textColor || "#ffffff"} onChange={(v) => update("textColor", v)} />
                <AlignSelect value={d.align || "center"} onChange={(v) => update("align", v)} />
                <div>
                  <FieldLabel>Border radius: {d.borderRadius || 6}px</FieldLabel>
                  <input type="range" min={0} max={24} value={d.borderRadius || 6} onChange={(e) => update("borderRadius", Number(e.target.value))} className="w-full" />
                </div>
                <label className="flex items-center gap-2 text-[12px] text-erp-text1 cursor-pointer">
                  <input type="checkbox" checked={d.fullWidth || false} onChange={(e) => update("fullWidth", e.target.checked)} className="rounded" />
                  Volledige breedte
                </label>
              </>
            )}
            {block.type === "divider" && (
              <>
                <ColorInput label="Lijnkleur" value={d.color || "#e5e7eb"} onChange={(v) => update("color", v)} />
                <div>
                  <FieldLabel>Padding: {d.padding || 20}px</FieldLabel>
                  <input type="range" min={4} max={60} value={d.padding || 20} onChange={(e) => update("padding", Number(e.target.value))} className="w-full" />
                </div>
              </>
            )}
            {block.type === "spacer" && (
              <div>
                <FieldLabel>Hoogte: {d.height || 30}px</FieldLabel>
                <input type="range" min={8} max={120} value={d.height || 30} onChange={(e) => update("height", Number(e.target.value))} className="w-full" />
              </div>
            )}
            {block.type === "columns" && (
              <div>
                <FieldLabel>Aantal kolommen</FieldLabel>
                <div className="flex gap-1">
                  {[2, 3].map(n => (
                    <button key={n} onClick={() => {
                      const content = d.content || [];
                      const newContent = Array.from({ length: n }, (_, i) => content[i] || []);
                      onUpdateBlock({ ...d, columns: n, content: newContent });
                    }} className={`flex-1 py-1.5 rounded text-[12px] ${d.columns === n ? "bg-erp-blue text-white" : "bg-erp-bg2 border border-erp-border0 text-erp-text2"}`}>{n} kolommen</button>
                  ))}
                </div>
              </div>
            )}
            {block.type === "social" && (
              <>
                <div>
                  <FieldLabel>Social links</FieldLabel>
                  {(d.links || []).map((l: any, i: number) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <select value={l.platform} onChange={(e) => {
                        const links = [...(d.links || [])];
                        links[i] = { ...links[i], platform: e.target.value };
                        update("links", links);
                      }} className="bg-erp-bg2 border border-erp-border0 rounded px-1 py-1 text-[11px] w-24">
                        {["instagram", "linkedin", "facebook", "x", "youtube"].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input type="text" value={l.url} onChange={(e) => {
                        const links = [...(d.links || [])];
                        links[i] = { ...links[i], url: e.target.value };
                        update("links", links);
                      }} className="flex-1 bg-erp-bg2 border border-erp-border0 rounded px-2 py-1 text-[11px]" placeholder="URL" />
                      <button onClick={() => {
                        const links = (d.links || []).filter((_: any, j: number) => j !== i);
                        update("links", links);
                      }} className="text-red-400 text-[12px] px-1">✕</button>
                    </div>
                  ))}
                  <button onClick={() => update("links", [...(d.links || []), { platform: "instagram", url: "" }])} className="text-[11px] text-erp-blue hover:underline mt-1">+ Link toevoegen</button>
                </div>
                <AlignSelect value={d.align || "center"} onChange={(v) => update("align", v)} />
              </>
            )}
            {block.type === "footer" && (
              <>
                <div><FieldLabel>Tekst</FieldLabel><TextAreaWithMerge value={d.text || ""} onChange={(v) => update("text", v)} rows={2} /></div>
                <label className="flex items-center gap-2 text-[12px] text-erp-text1 cursor-pointer">
                  <input type="checkbox" checked={d.unsubscribeUrl !== false} onChange={(e) => update("unsubscribeUrl", e.target.checked)} className="rounded" />
                  Uitschrijflink tonen
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
