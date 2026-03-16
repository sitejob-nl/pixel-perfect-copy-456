import { useMemo } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge, Avatar, Chip } from "@/components/erp/ErpPrimitives";
import type { TaskWithRelations } from "@/hooks/useTasks";

const statusConfig: { key: string; label: string; color: string }[] = [
  { key: "todo", label: "Te doen", color: "hsl(var(--erp-blue))" },
  { key: "in_progress", label: "Bezig", color: "hsl(var(--erp-amber))" },
  { key: "completed", label: "Afgerond", color: "hsl(var(--erp-green))" },
];

const priorityColors: Record<string, string> = {
  urgent: "hsl(var(--erp-red))", high: "hsl(var(--erp-orange))",
  medium: "hsl(var(--erp-blue))", low: "hsl(var(--erp-text-3))",
};
const priorityLabels: Record<string, string> = {
  urgent: "Urgent", high: "Hoog", medium: "Normaal", low: "Laag",
};

interface Props {
  tasks: TaskWithRelations[];
  onStatusChange: (id: string, status: string) => void;
  onClick: (t: TaskWithRelations) => void;
}

function DroppableColumn({ id, label, color, tasks, onClick }: {
  id: string; label: string; color: string; tasks: TaskWithRelations[]; onClick: (t: TaskWithRelations) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn("flex-1 min-w-[280px] max-w-[400px] flex flex-col", isOver && "opacity-80")}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold text-erp-text1 uppercase tracking-wider">{label}</span>
        <span className="text-xs text-erp-text3 ml-auto">{tasks.length}</span>
      </div>
      <div className={cn("flex-1 space-y-2 p-2 rounded-xl border border-erp-border0 bg-erp-bg1 min-h-[200px]", isOver && "ring-1 ring-erp-blue")}>
        {tasks.map(t => {
          const linked = t.companies?.name || (t.contacts ? `${t.contacts.first_name} ${t.contacts.last_name ?? ""}`.trim() : null) || t.deals?.title;
          return (
            <div
              key={t.id}
              draggable
              onDragStart={e => e.dataTransfer.setData("taskId", t.id)}
              onClick={() => onClick(t)}
              className="bg-erp-bg2 border border-erp-border0 rounded-lg p-3 cursor-pointer hover:bg-erp-hover transition-colors"
            >
              <div className={cn("text-[13px] font-semibold mb-1", t.status === "completed" ? "text-erp-text3 line-through" : "text-erp-text0")}>{t.title}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={priorityColors[t.priority] || priorityColors.medium}>
                  {priorityLabels[t.priority] || t.priority}
                </Badge>
                {linked && <Chip>{linked}</Chip>}
              </div>
              <div className="flex items-center justify-between mt-2">
                {t.due_date ? (
                  <span className="text-[11px] text-erp-text3">{format(new Date(t.due_date), "d MMM", { locale: nl })}</span>
                ) : <span />}
                {t.assigned_profile?.full_name && <Avatar name={t.assigned_profile.full_name} size={22} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks, onStatusChange, onClick }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const map: Record<string, TaskWithRelations[]> = { todo: [], in_progress: [], completed: [] };
    tasks.forEach(t => {
      const key = map[t.status] ? t.status : "todo";
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus);
    }
  };

  // Use native drag events as fallback since dnd-kit draggable isn't on cards
  const handleNativeDrop = (status: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) onStatusChange(taskId, status);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusConfig.map(s => (
          <div
            key={s.key}
            onDragOver={e => e.preventDefault()}
            onDrop={handleNativeDrop(s.key)}
          >
            <DroppableColumn
              id={s.key}
              label={s.label}
              color={s.color}
              tasks={grouped[s.key] || []}
              onClick={onClick}
            />
          </div>
        ))}
      </div>
    </DndContext>
  );
}
