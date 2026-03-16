import { cn } from "@/lib/utils";
import { format, isPast, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Avatar, Badge, Chip } from "@/components/erp/ErpPrimitives";
import type { TaskWithRelations } from "@/hooks/useTasks";

const priorityColors: Record<string, string> = {
  urgent: "hsl(var(--erp-red))",
  high: "hsl(var(--erp-orange))",
  medium: "hsl(var(--erp-blue))",
  low: "hsl(var(--erp-text-3))",
};
const priorityLabels: Record<string, string> = {
  urgent: "Urgent", high: "Hoog", medium: "Normaal", low: "Laag",
};

interface Props {
  task: TaskWithRelations;
  onToggle: (id: string, done: boolean) => void;
  onClick: (t: TaskWithRelations) => void;
}

export default function TaskListItem({ task, onToggle, onClick }: Props) {
  const done = task.status === "completed";
  const overdue = !done && task.due_date && isPast(startOfDay(new Date(task.due_date))) && startOfDay(new Date(task.due_date)).getTime() < startOfDay(new Date()).getTime();

  const linkedLabel = task.companies?.name || (task.contacts ? `${task.contacts.first_name} ${task.contacts.last_name ?? ""}`.trim() : null) || task.deals?.title;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 bg-erp-bg2 border border-erp-border0 rounded-xl hover:bg-erp-hover transition-colors cursor-pointer group",
        overdue && "border-l-4 border-l-erp-red"
      )}
      onClick={() => onClick(task)}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={e => { e.stopPropagation(); onToggle(task.id, !done); }}
        className="w-4 h-4 mt-0.5 rounded border-erp-border1 accent-erp-blue cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className={cn("text-[13px] font-semibold", done ? "text-erp-text3 line-through" : "text-erp-text0")}>
          {task.title}
        </div>
        {linkedLabel && (
          <div className="flex gap-1.5 mt-1.5">
            <Chip>{linkedLabel}</Chip>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <Badge color={priorityColors[task.priority] || priorityColors.medium}>
          {priorityLabels[task.priority] || task.priority}
        </Badge>
        {task.due_date && (
          <span className={cn("text-[11px]", overdue ? "text-erp-red font-semibold" : "text-erp-text3")}>
            {format(new Date(task.due_date), "d MMM", { locale: nl })}
          </span>
        )}
        {task.profiles?.full_name && (
          <Avatar name={task.profiles.full_name} size={24} />
        )}
      </div>
    </div>
  );
}
