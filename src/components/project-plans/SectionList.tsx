import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { GripVertical, Eye, EyeOff, Trash2, Plus, FileText, Users, AlignLeft, Package, Calendar, DollarSign, CheckSquare, AlertTriangle, Scale, Shield, Lock, PenTool, File, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type SectionRow = Database["public"]["Tables"]["project_plan_sections"]["Row"];

const SECTION_ICONS: Record<string, any> = {
  cover: FileText, parties: Users, description: AlignLeft, scope: Package,
  timeline: Calendar, investment: DollarSign, deliverables: CheckSquare,
  assumptions: AlertTriangle, terms: Scale, sla: Shield, security: Lock,
  signatures: PenTool, custom: File,
};

const SECTION_TYPES = [
  { type: "scope", label: "Scope" },
  { type: "deliverables", label: "Deliverables" },
  { type: "timeline", label: "Timeline" },
  { type: "investment", label: "Investering" },
  { type: "assumptions", label: "Aannames" },
  { type: "terms", label: "Voorwaarden" },
  { type: "sla", label: "SLA" },
  { type: "security", label: "Beveiliging" },
  { type: "custom", label: "Vrije sectie" },
];

interface Props {
  sections: SectionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (sections: SectionRow[]) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (type: string) => void;
}

function SortableItem({ section, isSelected, onSelect, onToggleVis, onDelete }: {
  section: SectionRow; isSelected: boolean;
  onSelect: () => void; onToggleVis: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const Icon = SECTION_ICONS[section.section_type] || File;
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors group",
        isSelected ? "bg-erp-bg-active border border-erp-border1" : "hover:bg-erp-hover border border-transparent"
      )}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-erp-text3 hover:text-erp-text1">
        <GripVertical className="w-4 h-4" />
      </span>
      <Icon className="w-4 h-4 text-erp-text2 shrink-0" />
      <span className={cn("flex-1 text-sm truncate", section.is_visible ? "text-erp-text0" : "text-erp-text3 line-through")}>
        {section.title}
      </span>
      <button onClick={e => { e.stopPropagation(); onToggleVis(); }} className="opacity-0 group-hover:opacity-100 text-erp-text3 hover:text-erp-text1 transition-opacity">
        {section.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
      <button onClick={e => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-erp-text3 hover:text-red-400 transition-opacity">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SectionList({ sections, selectedId, onSelect, onReorder, onToggleVisibility, onDelete, onAdd }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    onReorder(arrayMove(sections, oldIndex, newIndex));
  };

  return (
    <div className="space-y-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map(s => (
            <SortableItem
              key={s.id}
              section={s}
              isSelected={selectedId === s.id}
              onSelect={() => onSelect(s.id)}
              onToggleVis={() => onToggleVisibility(s.id, !s.is_visible)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full text-xs text-erp-text2 gap-1 mt-2">
            <Plus className="w-3.5 h-3.5" /> Sectie toevoegen <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-erp-bg3 border-erp-border0">
          {SECTION_TYPES.map(st => {
            const Icon = SECTION_ICONS[st.type] || File;
            return (
              <DropdownMenuItem key={st.type} onClick={() => onAdd(st.type)} className="text-erp-text1 focus:bg-erp-hover text-xs gap-2">
                <Icon className="w-3.5 h-3.5" /> {st.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
