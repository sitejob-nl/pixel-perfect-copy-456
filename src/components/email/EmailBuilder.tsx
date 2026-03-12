import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BlockPalette, { blockTypes } from "./BlockPalette";
import BlockRenderer from "./BlockRenderer";
import BlockSettings from "./BlockSettings";
import { generateHtml, getDefaultDesign, type Block, type DesignJson, type DesignSettings } from "./generateHtml";

interface Props {
  initialDesign?: DesignJson | null;
  onSave: (design: DesignJson, html: string) => void;
  saving?: boolean;
}

function SortableBlock({ block, settings, selected, onSelect, onMove, onDuplicate, onDelete }: {
  block: Block; settings: DesignSettings; selected: boolean;
  onSelect: () => void; onMove: (d: -1 | 1) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BlockRenderer block={block} settings={settings} selected={selected} onSelect={onSelect} onMove={onMove} onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
}

export default function EmailBuilder({ initialDesign, onSave, saving }: Props) {
  // Ensure we always have valid design with settings
  const getValidDesign = (d: DesignJson | null | undefined): DesignJson => {
    if (!d) return getDefaultDesign();
    return {
      settings: { ...getDefaultDesign().settings, ...d.settings },
      blocks: d.blocks || [],
    };
  };

  const [design, setDesign] = useState<DesignJson>(getValidDesign(initialDesign));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "html">("desktop");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedBlock = design.blocks.find(b => b.id === selectedId) || null;

  const updateBlocks = useCallback((blocks: Block[]) => {
    setDesign(d => ({ ...d, blocks }));
  }, []);

  const updateSettings = useCallback((partial: Partial<DesignSettings>) => {
    setDesign(d => ({
      ...d,
      settings: { ...(d.settings || getDefaultDesign().settings), ...partial },
    }));
  }, []);

  const updateBlockData = useCallback((data: Record<string, any>) => {
    if (!selectedId) return;
    setDesign(d => ({
      ...d,
      blocks: d.blocks.map(b => b.id === selectedId ? { ...b, data } : b),
    }));
  }, [selectedId]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;

    // From palette
    const paletteData = active.data.current;
    if (paletteData?.fromPalette) {
      const bt = blockTypes.find(b => b.type === paletteData.blockType);
      if (!bt) return;
      const newBlock: Block = { id: crypto.randomUUID(), type: bt.type, data: { ...bt.defaultData } };
      const overIndex = design.blocks.findIndex(b => b.id === over.id);
      const blocks = [...design.blocks];
      if (overIndex >= 0) {
        blocks.splice(overIndex, 0, newBlock);
      } else {
        blocks.push(newBlock);
      }
      updateBlocks(blocks);
      setSelectedId(newBlock.id);
      return;
    }

    // Reorder
    if (active.id !== over.id) {
      const oldIndex = design.blocks.findIndex(b => b.id === active.id);
      const newIndex = design.blocks.findIndex(b => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        updateBlocks(arrayMove(design.blocks, oldIndex, newIndex));
      }
    }
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = design.blocks.findIndex(b => b.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= design.blocks.length) return;
    updateBlocks(arrayMove(design.blocks, idx, newIdx));
  };

  const duplicateBlock = (id: string) => {
    const idx = design.blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const clone: Block = { ...design.blocks[idx], id: crypto.randomUUID(), data: { ...design.blocks[idx].data } };
    const blocks = [...design.blocks];
    blocks.splice(idx + 1, 0, clone);
    updateBlocks(blocks);
    setSelectedId(clone.id);
  };

  const deleteBlock = (id: string) => {
    updateBlocks(design.blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addBlock = (type: string) => {
    const bt = blockTypes.find(b => b.type === type);
    if (!bt) return;
    const newBlock: Block = { id: crypto.randomUUID(), type: bt.type, data: { ...bt.defaultData } };
    updateBlocks([...design.blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  // Safely generate HTML with fallback settings
  const htmlPreview = useMemo(() => {
    const safeDesign = {
      ...design,
      settings: { ...getDefaultDesign().settings, ...design.settings },
    };
    return generateHtml(safeDesign);
  }, [design]);

  const handleSave = () => {
    onSave(design, htmlPreview);
  };

  return (
    <div className="flex h-full bg-erp-bg0 rounded-xl border border-erp-border0 overflow-hidden">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Left: Block Palette */}
        <BlockPalette />

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-erp-border0 bg-erp-bg1">
            <div className="flex gap-1">
              {(["desktop", "mobile", "html"] as const).map(m => (
                <button key={m} onClick={() => setPreviewMode(m)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${previewMode === m ? "bg-erp-bg3 text-erp-text0 border border-erp-border0" : "text-erp-text3 hover:text-erp-text1"}`}>
                  {m === "desktop" ? "🖥 Desktop" : m === "mobile" ? "📱 Mobiel" : "< > HTML"}
                </button>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 rounded-lg bg-erp-blue text-white text-[12px] font-medium hover:bg-erp-blue/90 disabled:opacity-50">
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto p-6" onClick={() => setSelectedId(null)} style={{ backgroundColor: design.settings?.backgroundColor || "#f4f4f5" }}>
            {previewMode === "html" ? (
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-end mb-2">
                  <button onClick={() => navigator.clipboard.writeText(htmlPreview)} className="text-[11px] text-erp-blue hover:underline">📋 Kopiëren</button>
                </div>
                <pre className="bg-erp-bg1 border border-erp-border0 rounded-lg p-4 text-[11px] text-erp-text1 overflow-auto whitespace-pre-wrap font-mono max-h-[70vh]">{htmlPreview}</pre>
              </div>
            ) : (
              <div
                className="mx-auto bg-white rounded-lg shadow-sm"
                style={{ maxWidth: previewMode === "mobile" ? "375px" : `${design.settings?.contentWidth || 600}px`, padding: "32px 24px" }}
              >
              >
                <SortableContext items={design.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {design.blocks.map(block => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      settings={design.settings}
                      selected={selectedId === block.id}
                      onSelect={() => setSelectedId(block.id)}
                      onMove={(d) => moveBlock(block.id, d)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </SortableContext>

                {design.blocks.length === 0 && (
                  <div className="text-center py-16 text-erp-text3 text-[13px]">
                    Sleep blokken van links naar hier om te beginnen
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDragId && activeDragId.startsWith("palette-") && (
            <div className="bg-erp-bg3 border border-erp-blue rounded-lg px-4 py-2 text-[12px] text-erp-text0 shadow-lg">
              {blockTypes.find(b => `palette-${b.type}` === activeDragId)?.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Right: Settings */}
      <BlockSettings block={selectedBlock} settings={design.settings} onUpdateBlock={updateBlockData} onUpdateSettings={updateSettings} />
    </div>
  );
}
