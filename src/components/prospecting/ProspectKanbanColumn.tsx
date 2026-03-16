import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { KanbanStage, ProspectLead } from "@/hooks/useProspectKanban";
import ProspectCard from "./ProspectCard";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search, BarChart2, Layout, Send, Eye, Phone, ThumbsUp,
  ArrowRight, XCircle, Slash, ChevronRight,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<any>> = {
  search: Search,
  "bar-chart-2": BarChart2,
  layout: Layout,
  send: Send,
  eye: Eye,
  phone: Phone,
  "thumbs-up": ThumbsUp,
  "arrow-right": ArrowRight,
  "x-circle": XCircle,
  slash: Slash,
};

interface Props {
  stage: KanbanStage;
  leads: ProspectLead[];
  onCardClick: (lead: ProspectLead) => void;
}

export default function ProspectKanbanColumn({ stage, leads, onCardClick }: Props) {
  const [collapsed, setCollapsed] = useState(stage.is_terminal);
  const { setNodeRef, isOver } = useDroppable({ id: stage.status_key });
  const Icon = iconMap[stage.icon] || Search;

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        onClick={() => setCollapsed(false)}
        className={cn(
          "flex-shrink-0 w-[48px] bg-erp-bg2 border border-erp-border0 rounded-xl cursor-pointer hover:border-erp-border1 transition-colors flex flex-col items-center py-3 gap-2",
          isOver && "border-erp-blue/50 bg-erp-blue/5"
        )}
      >
        <div className="w-full h-[3px] rounded-t-xl" style={{ background: stage.color }} />
        <Icon className="w-4 h-4" style={{ color: stage.color }} />
        <span
          className="text-[10px] font-semibold whitespace-nowrap"
          style={{ color: stage.color, writingMode: "vertical-lr", textOrientation: "mixed" }}
        >
          {stage.label}
        </span>
        <span className="text-[10px] font-bold text-erp-text3 bg-erp-bg3 rounded-full w-5 h-5 flex items-center justify-center">
          {leads.length}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] bg-erp-bg1 border border-erp-border0 rounded-xl flex flex-col max-h-full transition-colors",
        isOver && "border-erp-blue/50 bg-erp-blue/5"
      )}
    >
      {/* Color bar */}
      <div className="h-[3px] rounded-t-xl" style={{ background: stage.color }} />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-erp-border0">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: stage.color }} />
        <span className="text-[12px] font-semibold text-erp-text0 flex-1">{stage.label}</span>
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-erp-bg3 text-erp-text2">
          {leads.length}
        </span>
        {stage.is_terminal && (
          <button onClick={() => setCollapsed(true)} className="text-erp-text3 hover:text-erp-text1">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]">
          {leads.map(lead => (
            <ProspectCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
          ))}
          {leads.length === 0 && (
            <div className="text-[11px] text-erp-text3 text-center py-4">Geen prospects</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
