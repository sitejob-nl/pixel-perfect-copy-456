import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type TaskWithRelations } from "@/hooks/useTasks";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { useDeals } from "@/hooks/useDeals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek } from "date-fns";
import { toast } from "sonner";
import { CheckSquare, List, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import { PageHeader, ErpButton, StatCard, FilterButton } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskList from "@/components/tasks/TaskList";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskWeekView from "@/components/tasks/TaskWeekView";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import NewTaskDialog from "@/components/tasks/NewTaskDialog";

type View = "list" | "board" | "week";

export default function TasksPage() {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const { data: companiesData = [] } = useCompanies();
  const { data: contactsData = [] } = useContacts();
  const { data: dealsData = [] } = useDeals();

  const { data: members = [] } = useQuery({
    queryKey: ["org-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, full_name, email)")
        .eq("organization_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [view, setView] = useState<View>("list");
  const [assignedFilter, setAssignedFilter] = useState("mine");
  const [priorityFilter, setPriorityFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Filter tasks
  const filtered = useMemo(() => {
    let result = tasks;
    if (assignedFilter === "mine") result = result.filter(t => t.assigned_to === user?.id);
    if (priorityFilter !== "alle") result = result.filter(t => t.priority === priorityFilter);
    if (statusFilter !== "alle") result = result.filter(t => t.status === statusFilter);
    return result;
  }, [tasks, assignedFilter, priorityFilter, statusFilter, user?.id]);

  // Stats
  const openCount = tasks.filter(t => t.status !== "completed").length;
  const myCount = tasks.filter(t => t.assigned_to === user?.id && t.status !== "completed").length;
  const overdueCount = tasks.filter(t => {
    if (t.status === "completed" || !t.due_date) return false;
    return new Date(t.due_date) < new Date(new Date().toDateString());
  }).length;

  const handleToggle = (id: string, done: boolean) => {
    updateTask.mutate(
      { id, status: done ? "completed" : "todo", completed_at: done ? new Date().toISOString() : null },
      { onError: () => toast.error("Fout bij bijwerken") }
    );
  };

  const handleStatusChange = (id: string, status: string) => {
    updateTask.mutate(
      { id, status, completed_at: status === "completed" ? new Date().toISOString() : null },
      { onError: () => toast.error("Fout bij bijwerken") }
    );
  };

  const handleUpdate = (id: string, updates: Record<string, any>) => {
    updateTask.mutate({ id, ...updates }, {
      onError: () => toast.error("Fout bij opslaan"),
    });
  };

  const handleCreate = (task: Record<string, any>) => {
    if (!orgId) return;
    createTask.mutate(
      { ...task, organization_id: orgId, created_by: user?.id },
      { onSuccess: () => toast.success("Taak aangemaakt"), onError: (e: any) => toast.error(e.message) }
    );
  };

  const companiesList = companiesData.map(c => ({ id: c.id, name: c.name }));
  const contactsList = contactsData.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name }));
  const dealsList = (dealsData || []).map(d => ({ id: d.id, title: d.title }));

  const viewButtons: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "list", label: "Lijst", icon: <List className="w-4 h-4" /> },
    { key: "board", label: "Bord", icon: <LayoutGrid className="w-4 h-4" /> },
    { key: "week", label: "Week", icon: <CalendarIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-fade-up max-w-[1400px]">
      <PageHeader title="Taken" desc="Beheer en volg alle taken">
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuwe taak
        </ErpButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Open taken" value={String(openCount)} change="" up />
        <StatCard label="Mijn taken" value={String(myCount)} change="" up />
        <StatCard label="Achterstallig" value={String(overdueCount)} change="" up={false} />
      </div>

      {/* View toggle + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex bg-erp-bg3 rounded-lg p-0.5 border border-erp-border0">
          {viewButtons.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === v.key ? "bg-erp-blue text-white" : "text-erp-text2 hover:text-erp-text0"
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-erp-border0" />

        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="w-[140px] bg-erp-bg3 border-erp-border0 text-erp-text0 text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-erp-bg3 border-erp-border0">
            <SelectItem value="mine" className="text-erp-text0 text-xs focus:bg-erp-hover">Mijn taken</SelectItem>
            <SelectItem value="all" className="text-erp-text0 text-xs focus:bg-erp-hover">Alle taken</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[120px] bg-erp-bg3 border-erp-border0 text-erp-text0 text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-erp-bg3 border-erp-border0">
            <SelectItem value="alle" className="text-erp-text0 text-xs focus:bg-erp-hover">Alle prio</SelectItem>
            <SelectItem value="urgent" className="text-erp-text0 text-xs focus:bg-erp-hover">Urgent</SelectItem>
            <SelectItem value="high" className="text-erp-text0 text-xs focus:bg-erp-hover">Hoog</SelectItem>
            <SelectItem value="medium" className="text-erp-text0 text-xs focus:bg-erp-hover">Normaal</SelectItem>
            <SelectItem value="low" className="text-erp-text0 text-xs focus:bg-erp-hover">Laag</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] bg-erp-bg3 border-erp-border0 text-erp-text0 text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-erp-bg3 border-erp-border0">
            <SelectItem value="alle" className="text-erp-text0 text-xs focus:bg-erp-hover">Alle status</SelectItem>
            <SelectItem value="todo" className="text-erp-text0 text-xs focus:bg-erp-hover">Te doen</SelectItem>
            <SelectItem value="in_progress" className="text-erp-text0 text-xs focus:bg-erp-hover">Bezig</SelectItem>
            <SelectItem value="completed" className="text-erp-text0 text-xs focus:bg-erp-hover">Afgerond</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center text-erp-text3 text-sm py-12">Laden...</div>
      ) : (
        <>
          {view === "list" && (
            <TaskList tasks={filtered} onToggle={handleToggle} onClick={setSelectedTask} />
          )}
          {view === "board" && (
            <TaskBoard tasks={filtered} onStatusChange={handleStatusChange} onClick={setSelectedTask} />
          )}
          {view === "week" && (
            <TaskWeekView
              tasks={filtered}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              onClick={setSelectedTask}
              onToggle={handleToggle}
            />
          )}
        </>
      )}

      {/* Detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={o => { if (!o) setSelectedTask(null); }}
        onUpdate={handleUpdate}
        onDelete={(id) => {
          deleteTask.mutate(id, { onSuccess: () => toast.success("Taak verwijderd") });
          setSelectedTask(null);
        }}
        members={members}
        companies={companiesList}
        contacts={contactsList}
        deals={dealsList}
      />

      {/* New task dialog */}
      <NewTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
        members={members}
        companies={companiesList}
        contacts={contactsList}
        deals={dealsList}
        currentUserId={user?.id}
      />
    </div>
  );
}
