import { differenceInDays, format, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ErpCard, Avatar } from "@/components/erp/ErpPrimitives";
import { CheckSquare } from "lucide-react";
import type { DealWithRelations } from "@/hooks/useDeals";

const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v);

interface Props {
  deal: DealWithRelations;
  onClick: () => void;
  taskCount?: number;
}

export default function DealCard({ deal, onClick, taskCount = 0 }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at));
  const contactName = deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name ?? ""}`.trim() : null;
  const assignedName = deal.profiles?.full_name ?? deal.profiles?.email ?? null;
  const isOverdue = deal.expected_close && isPast(new Date(deal.expected_close));
  const stageColor = deal.pipeline_stages?.color ?? "#6b7280";

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ErpCard className="p-3 cursor-grab active:cursor-grabbing" hover onClick={onClick}>
        <div className="text-[13px] font-semibold text-erp-text0 truncate">{deal.title}</div>
        {deal.companies?.name && (
          <div className="text-xs text-erp-text2 truncate mt-0.5">{deal.companies.name}</div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-erp-text0">{eur(deal.value ? Number(deal.value) : 0)}</span>
          {contactName && <Avatar name={contactName} id={deal.id.charCodeAt(0)} size={22} />}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {deal.expected_close && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isOverdue ? "bg-erp-red/10 text-erp-red" : "bg-erp-bg4 text-erp-text3"}`}>
              {format(new Date(deal.expected_close), "d MMM", { locale: nl })}
            </span>
          )}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${daysInStage > 14 ? "bg-erp-orange/10 text-erp-orange" : "bg-erp-bg4 text-erp-text3"}`}>
            {daysInStage}d
          </span>
          {taskCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-erp-bg4 text-erp-text3 flex items-center gap-0.5">
              <CheckSquare className="w-3 h-3" /> {taskCount}
            </span>
          )}
        </div>

        {assignedName && (
          <div className="flex items-center gap-1.5 mt-2">
            <Avatar name={assignedName} id={deal.assigned_to?.charCodeAt(0) ?? 0} size={18} />
            <span className="text-[10px] text-erp-text3 truncate">{assignedName}</span>
          </div>
        )}
      </ErpCard>
    </div>
  );
}
