import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import TaskListItem from "./TaskListItem";
import type { TaskWithRelations } from "@/hooks/useTasks";

interface Props {
  label: string;
  tasks: TaskWithRelations[];
  color?: string;
  defaultCollapsed?: boolean;
  onToggle: (id: string, done: boolean) => void;
  onClick: (t: TaskWithRelations) => void;
}

export default function TaskListGroup({ label, tasks, color, defaultCollapsed = false, onToggle, onClick }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (tasks.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider hover:opacity-80"
        style={{ color: color || "hsl(var(--erp-text-2))" }}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {label}
        <span className="text-erp-text3 font-normal normal-case">({tasks.length})</span>
      </button>
      {!collapsed && (
        <div className="space-y-1.5">
          {tasks.map(t => (
            <TaskListItem key={t.id} task={t} onToggle={onToggle} onClick={onClick} />
          ))}
        </div>
      )}
    </div>
  );
}
