import type { Block, DesignSettings } from "./generateHtml";

interface Props {
  block: Block;
  settings: DesignSettings;
  selected: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function BlockRenderer({ block, settings, selected, onSelect, onMove, onDuplicate, onDelete }: Props) {
  const d = block.data || {};

  const renderContent = () => {
    switch (block.type) {
      case "header": {
        const Tag = (`h${d.level || 1}`) as keyof JSX.IntrinsicElements;
        const sizes: Record<number, string> = { 1: "28px", 2: "22px", 3: "18px" };
        return <Tag style={{ margin: 0, padding: "16px 0", fontFamily: settings.fontFamily, fontSize: sizes[d.level] || "28px", fontWeight: "bold", textAlign: d.align || "center", color: d.color || "#1a1a1a" }}>{d.text || "Titel"}</Tag>;
      }
      case "text": {
        const sizes: Record<string, string> = { small: "13px", normal: "15px", large: "18px" };
        return <div style={{ padding: "8px 0", fontFamily: settings.fontFamily, fontSize: sizes[d.fontSize] || "15px", lineHeight: 1.6, textAlign: d.align || "left", color: d.color || "#374151", whiteSpace: "pre-wrap" }}>{d.text || "Tekst..."}</div>;
      }
      case "image":
        return <div style={{ padding: "8px 0", textAlign: d.align || "center" }}>{d.src ? <img src={d.src} alt={d.alt || ""} style={{ maxWidth: d.width || "100%", height: "auto", display: "inline-block" }} /> : <div className="bg-erp-bg4 rounded-lg h-24 flex items-center justify-center text-erp-text3 text-[12px]">📷 Afbeelding URL invoeren</div>}</div>;
      case "button":
        return <div style={{ padding: "16px 0", textAlign: d.align || "center" }}><span style={{ display: d.fullWidth ? "block" : "inline-block", backgroundColor: d.color || settings.accentColor, color: d.textColor || "#fff", padding: "14px 28px", borderRadius: `${d.borderRadius || 6}px`, fontFamily: settings.fontFamily, fontSize: "15px", fontWeight: 600, cursor: "default" }}>{d.text || "Knop"}</span></div>;
      case "divider":
        return <div style={{ padding: `${d.padding || 20}px 0` }}><hr style={{ border: "none", borderTop: `1px solid ${d.color || "#e5e7eb"}` }} /></div>;
      case "spacer":
        return <div style={{ height: `${d.height || 30}px` }} className="flex items-center justify-center"><span className="text-erp-text3 text-[10px]">↕ {d.height || 30}px</span></div>;
      case "columns": {
        const cols = d.columns || 2;
        const content = d.content || [];
        return (
          <div style={{ display: "flex", gap: "16px", padding: "8px 0" }}>
            {Array.from({ length: cols }, (_, i) => (
              <div key={i} style={{ flex: 1, minHeight: "40px" }} className="border border-dashed border-erp-border0 rounded p-2">
                {(content[i] || []).length > 0
                  ? (content[i] as Block[]).map((b: Block) => <div key={b.id} className="text-[12px] text-erp-text2">{b.data?.text || b.type}</div>)
                  : <span className="text-[11px] text-erp-text3">Kolom {i + 1}</span>}
              </div>
            ))}
          </div>
        );
      }
      case "social": {
        const icons: Record<string, string> = { instagram: "📸", linkedin: "💼", facebook: "📘", x: "𝕏", youtube: "▶️" };
        const links = (d.links || []) as Array<{ platform: string; url: string }>;
        return <div style={{ padding: "12px 0", textAlign: d.align || "center" }}>{links.length > 0 ? links.map((l, i) => <span key={i} style={{ display: "inline-block", margin: "0 6px", fontSize: `${d.iconSize || 20}px` }}>{icons[l.platform] || "🔗"}</span>) : <span className="text-[12px] text-erp-text3">Social links toevoegen →</span>}</div>;
      }
      case "footer":
        return <div style={{ padding: "16px 0", textAlign: "center", fontFamily: settings.fontFamily, fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>{d.text || "Footer"}{d.unsubscribeUrl !== false && <><br /><span style={{ textDecoration: "underline" }}>Uitschrijven</span></>}</div>;
      default:
        return <div className="text-erp-text3 text-[12px]">Onbekend block: {block.type}</div>;
    }
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`group relative rounded-lg transition-all cursor-pointer ${selected ? "ring-2 ring-erp-blue" : "hover:ring-1 hover:ring-erp-border0"}`}
    >
      {renderContent()}
      {/* Hover toolbar */}
      <div className={`absolute -top-8 right-0 flex gap-1 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} className="w-6 h-6 rounded bg-erp-bg3 border border-erp-border0 text-[11px] hover:bg-erp-hover" title="Omhoog">⬆</button>
        <button onClick={(e) => { e.stopPropagation(); onMove(1); }} className="w-6 h-6 rounded bg-erp-bg3 border border-erp-border0 text-[11px] hover:bg-erp-hover" title="Omlaag">⬇</button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="w-6 h-6 rounded bg-erp-bg3 border border-erp-border0 text-[11px] hover:bg-erp-hover" title="Dupliceren">📋</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-6 h-6 rounded bg-erp-bg3 border border-erp-border0 text-[11px] hover:bg-erp-hover text-red-400" title="Verwijderen">🗑</button>
      </div>
    </div>
  );
}
