import { useMemo } from "react";
import { isToday, isPast, startOfDay, addDays, isAfter, isBefore } from "date-fns";
import TaskListGroup from "./TaskListGroup";
import type { TaskWithRelations } from "@/hooks/useTasks";

interface Props {
  tasks: TaskWithRelations[];
  onToggle: (id: string, done: boolean) => void;
  onClick: (t: TaskWithRelations) => void;
}

export default function TaskList({ tasks, onToggle, onClick }: Props) {
  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const weekEnd = addDays(today, 7);

    const overdue: TaskWithRelations[] = [];
    const todayTasks: TaskWithRelations[] = [];
    const thisWeek: TaskWithRelations[] = [];
    const later: TaskWithRelations[] = [];
    const completed: TaskWithRelations[] = [];

    tasks.forEach(t => {
      if (t.status === "completed") { completed.push(t); return; }
      if (!t.due_date) { later.push(t); return; }
      const d = startOfDay(new Date(t.due_date));
      if (isBefore(d, today)) overdue.push(t);
      else if (isToday(d)) todayTasks.push(t);
      else if (isBefore(d, weekEnd)) thisWeek.push(t);
      else later.push(t);
    });

    return { overdue, todayTasks, thisWeek, later, completed };
  }, [tasks]);

  if (tasks.length === 0) {
    return <div className="text-center text-erp-text3 text-sm py-12">Geen taken gevonden</div>;
  }

  return (
    <div>
      <TaskListGroup label="Achterstallig" tasks={groups.overdue} color="hsl(var(--erp-red))" onToggle={onToggle} onClick={onClick} />
      <TaskListGroup label="Vandaag" tasks={groups.todayTasks} color="hsl(var(--erp-amber))" onToggle={onToggle} onClick={onClick} />
      <TaskListGroup label="Deze week" tasks={groups.thisWeek} color="hsl(var(--erp-blue))" onToggle={onToggle} onClick={onClick} />
      <TaskListGroup label="Later" tasks={groups.later} onToggle={onToggle} onClick={onClick} />
      <TaskListGroup label="Afgerond" tasks={groups.completed} defaultCollapsed onToggle={onToggle} onClick={onClick} />
    </div>
  );
}
