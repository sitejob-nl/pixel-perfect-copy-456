import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Avatar } from "@/components/erp/ErpPrimitives";
import type { TaskWithRelations } from "@/hooks/useTasks";

const priorityColors: Record<string, string> = {
  urgent: "hsl(var(--erp-red))", high: "hsl(var(--erp-orange))",
  medium: "hsl(var(--erp-blue))", low: "hsl(var(--erp-text-3))",
};

interface Props {
  tasks: TaskWithRelations[];
  weekStart: Date;
  onWeekChange: (d: Date) => void;
  onClick: (t: TaskWithRelations) => void;
  onToggle: (id: string, done: boolean) => void;
}

export default function TaskWeekView({ tasks, weekStart, onWeekChange, onClick, onToggle }: Props) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const { byDay, unplanned } = useMemo(() => {
    const byDay: Record<string, TaskWithRelations[]> = {};
    days.forEach(d => { byDay[format(d, "yyyy-MM-dd")] = []; });
    const unplanned: TaskWithRelations[] = [];

    tasks.forEach(t => {
      if (!t.due_date) { unplanned.push(t); return; }
      const key = t.due_date;
      if (byDay[key]) byDay[key].push(t);
    });
    return { byDay, unplanned };
  }, [tasks, days]);

  const isCurrentDay = (d: Date) => isSameDay(d, new Date());

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onWeekChange(addDays(weekStart, -7))} className="p-1.5 rounded-lg hover:bg-erp-bg3 text-erp-text2">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-erp-text0">
          {format(weekStart, "d MMM", { locale: nl })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: nl })}
        </span>
        <button onClick={() => onWeekChange(addDays(weekStart, 7))} className="p-1.5 rounded-lg hover:bg-erp-bg3 text-erp-text2">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="text-xs text-erp-blue hover:underline ml-2"
        >
          Vandaag
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {days.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const dayTasks = byDay[key] || [];
          return (
            <div key={key} className={cn("bg-erp-bg1 border border-erp-border0 rounded-xl p-2 min-h-[180px]", isCurrentDay(d) && "ring-1 ring-erp-blue")}>
              <div className={cn("text-center mb-2", isCurrentDay(d) ? "text-erp-blue" : "text-erp-text2")}>
                <div className="text-[10px] uppercase font-semibold">{format(d, "EEE", { locale: nl })}</div>
                <div className={cn("text-lg font-bold", isCurrentDay(d) ? "text-erp-blue" : "text-erp-text0")}>{format(d, "d")}</div>
              </div>
              <div className="space-y-1.5">
                {dayTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => onClick(t)}
                    className="bg-erp-bg2 border border-erp-border0 rounded-lg p-2 cursor-pointer hover:bg-erp-hover transition-colors"
                  >
                    <div className="flex items-start gap-1.5">
                      <input
                        type="checkbox"
                        checked={t.status === "completed"}
                        onChange={e => { e.stopPropagation(); onToggle(t.id, t.status !== "completed"); }}
                        className="w-3.5 h-3.5 mt-0.5 rounded accent-erp-blue cursor-pointer flex-shrink-0"
                      />
                      <span className={cn("text-[11px] font-medium leading-tight", t.status === "completed" ? "text-erp-text3 line-through" : "text-erp-text0")}>
                        {t.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {unplanned.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-erp-text2 uppercase tracking-wider mb-2">Ongepland ({unplanned.length})</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {unplanned.map(t => (
              <div
                key={t.id}
                onClick={() => onClick(t)}
                className="bg-erp-bg2 border border-erp-border0 rounded-lg p-3 cursor-pointer hover:bg-erp-hover transition-colors"
              >
                <div className={cn("text-[12px] font-medium", t.status === "completed" ? "text-erp-text3 line-through" : "text-erp-text0")}>
                  {t.title}
                </div>
                <div className="mt-1">
                  <Badge color={priorityColors[t.priority] || priorityColors.medium}>
                    {t.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
