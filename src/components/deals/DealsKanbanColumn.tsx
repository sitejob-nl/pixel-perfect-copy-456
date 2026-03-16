import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { Dot, fmt } from "@/components/erp/ErpPrimitives";
import { ChevronDown, ChevronRight } from "lucide-react";
import DealCard from "./DealCard";
import type { DealWithRelations } from "@/hooks/useDeals";

const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v);

interface Props {
  stageId: string;
  stageName: string;
  color: string;
  deals: DealWithRelations[];
  isTerminal?: boolean;
  taskCounts: Record<string, number>;
  onDealClick: (d: DealWithRelations) => void;
}

export default function DealsKanbanColumn({ stageId, stageName, color, deals, isTerminal, taskCounts, onDealClick }: Props) {
  const [expanded, setExpanded] = useState(!isTerminal);
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const total = deals.reduce((a, d) => a + (d.value ? Number(d.value) : 0), 0);

  return (
    <div className="min-w-[260px] max-w-[260px] flex-shrink-0 flex flex-col">
      <div
        className="rounded-t-xl px-3 py-2 flex items-center justify-between cursor-pointer select-none"
        style={{ background: `${color}0c`, borderTop: `3px solid ${color}` }}
        onClick={() => isTerminal && setExpanded(!expanded)}
      >
        <span className="text-[13px] font-semibold flex items-center gap-2" style={{ color }}>
          {isTerminal && (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
          <Dot color={color} /> {stageName}
          <span className="text-[11px] font-bold px-[7px] py-[1px] rounded-full" style={{ background: `${color}20` }}>
            {deals.length}
          </span>
        </span>
        {total > 0 && <span className="text-[11px] text-erp-text3">{eur(total)}</span>}
      </div>

      {expanded && (
        <div
          ref={setNodeRef}
          className={`flex-1 flex flex-col gap-[6px] p-1 min-h-[60px] rounded-b-xl transition-colors ${isOver ? "bg-erp-blue/5" : ""}`}
        >
          <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {deals.map(d => (
              <DealCard key={d.id} deal={d} onClick={() => onDealClick(d)} taskCount={taskCounts[d.id] ?? 0} />
            ))}
          </SortableContext>
          {deals.length === 0 && (
            <div className="border border-dashed border-erp-border1 rounded-xl p-5 text-center text-erp-text3 text-xs">
              Sleep deals hierheen
            </div>
          )}
        </div>
      )}
    </div>
  );
}
