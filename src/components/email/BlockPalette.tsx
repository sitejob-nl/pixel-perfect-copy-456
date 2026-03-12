import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Block } from "./generateHtml";

const blockTypes = [
  { type: "header", icon: "H1", label: "Header", defaultData: { text: "Titel", level: 1, align: "center", color: "#1a1a1a" } },
  { type: "text", icon: "T", label: "Tekst", defaultData: { text: "Typ hier je tekst...", align: "left", fontSize: "normal", color: "#374151" } },
  { type: "image", icon: "🖼️", label: "Afbeelding", defaultData: { src: "", alt: "", width: "100%", align: "center" } },
  { type: "button", icon: "▶", label: "Knop", defaultData: { text: "Klik hier", url: "#", color: "#32C5FF", textColor: "#ffffff", align: "center", borderRadius: 6, fullWidth: false } },
  { type: "divider", icon: "—", label: "Scheidingslijn", defaultData: { color: "#e5e7eb", padding: 20 } },
  { type: "spacer", icon: "↕", label: "Ruimte", defaultData: { height: 30 } },
  { type: "columns", icon: "⬜⬜", label: "Kolommen", defaultData: { columns: 2, content: [[], []] } },
  { type: "social", icon: "📱", label: "Social Media", defaultData: { links: [], align: "center", iconSize: 20 } },
  { type: "footer", icon: "📎", label: "Footer", defaultData: { text: "{{org_name}} · {{org_email}}", unsubscribeUrl: true } },
];

export { blockTypes };

function PaletteItem({ type, icon, label }: { type: string; icon: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { fromPalette: true, blockType: type },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-erp-bg2 border border-erp-border0 cursor-grab hover:border-erp-blue/40 hover:bg-erp-hover transition-all text-[12px]"
    >
      <span className="w-6 text-center text-[14px]">{icon}</span>
      <span className="text-erp-text1 font-medium">{label}</span>
    </div>
  );
}

export default function BlockPalette() {
  return (
    <div className="w-[200px] min-w-[200px] bg-erp-bg1 border-r border-erp-border0 p-3 flex flex-col gap-1.5 overflow-y-auto">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-1 mb-1">Blokken</div>
      {blockTypes.map((bt) => (
        <PaletteItem key={bt.type} type={bt.type} icon={bt.icon} label={bt.label} />
      ))}
    </div>
  );
}
