import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, ErpCard, ErpButton, StatCard, FilterButton, Chip, Avatar, Dot, Badge } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek, isBefore, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

interface MyTask {
  id: string;
  organization_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  completed_at: string | null;
  project_name: string | null;
  project_number: string | null;
  company_name: string | null;
  company_id: string | null;
  assigned_to_name: string | null;
  urgency: string | null;
  created_at: string;
}

const priorityColors: Record<string, string> = {
  urgent: "hsl(0, 72%, 51%)",
  high: "hsl(25, 95%, 53%)",
  medium: "hsl(217, 91%, 60%)",
  low: "hsl(0, 0%, 50%)",
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgent",
  high: "Hoog",
  medium: "Medium",
  low: "Laag",
};

export default function TasksPage() {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();

  const [filter, setFilter] = useState("alle");
  const [prioFilter, setPrioFilter] = useState("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPriority, setFPriority] = useState("medium");
  const [fDueDate, setFDueDate] = useState<Date | undefined>();
  const [fAssignedTo, setFAssignedTo] = useState("");
  const [fProjectId, setFProjectId] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_my_tasks")
        .select("*")
        .eq("organization_id", orgId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as MyTask[]) ?? [];
    },
  });

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

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: any) => {
      const { error } = await (supabase as any).from("tasks").insert(task);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Taak aangemaakt");
    },
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await (supabase as any)
        .from("tasks")
        .update({ status: done ? "done" : "todo" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const openCount = tasks.filter(t => t.status !== "done" && t.status !== "cancelled").length;
  const todayCount = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== "done").length;

  // Filtering
  let filtered = tasks;
  if (filter === "mijn") filtered = filtered.filter(t => t.assigned_to === user?.id);
  if (filter === "overdue") filtered = filtered.filter(t => t.urgency === "overdue");
  if (filter === "vandaag") filtered = filtered.filter(t => t.urgency === "today" || t.urgency === "overdue");
  if (filter === "week") filtered = filtered.filter(t => ["overdue", "today", "tomorrow", "this_week"].includes(t.urgency || ""));
  // Exclude done unless "alle"
  if (filter !== "alle") filtered = filtered.filter(t => t.status !== "done" && t.status !== "cancelled");
  if (prioFilter !== "alle") filtered = filtered.filter(t => t.priority === prioFilter);

  const handleQuickAdd = () => {
    if (!quickAdd.trim() || !orgId) return;
    createTask.mutate({
      organization_id: orgId,
      title: quickAdd.trim(),
      status: "todo",
      priority: "medium",
      assigned_to: user?.id,
      due_date: new Date().toISOString().split("T")[0],
    });
    setQuickAdd("");
  };

  const handleCreate = () => {
    if (!fTitle.trim() || !orgId) return;
    createTask.mutate({
      organization_id: orgId,
      title: fTitle.trim(),
      description: fDesc || null,
      priority: fPriority,
      due_date: fDueDate ? format(fDueDate, "yyyy-MM-dd") : null,
      assigned_to: fAssignedTo || user?.id,
      project_id: fProjectId || null,
      status: "todo",
    });
    setDialogOpen(false);
    setFTitle(""); setFDesc(""); setFPriority("medium"); setFDueDate(undefined); setFAssignedTo(""); setFProjectId("");
  };

  const urgencyBorder = (u: string | null) => {
    if (u === "overdue") return "border-l-4 border-l-erp-red";
    if (u === "today") return "border-l-4 border-l-amber-500";
    if (u === "this_week" || u === "tomorrow") return "border-l-4 border-l-erp-blue";
    return "";
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Taken" desc="Beheer en volg alle taken">
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuwe taak
        </ErpButton>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <StatCard label="Open taken" value={String(openCount)} change="" up />
        <StatCard label="Vandaag" value={String(todayCount)} change="" up />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[["alle", "Alle"], ["mijn", "Mijn taken"], ["overdue", "Overdue"], ["vandaag", "Vandaag"], ["week", "Deze week"]].map(([k, l]) => (
          <FilterButton key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</FilterButton>
        ))}
        <div className="w-px bg-erp-border0 mx-1" />
        {[["alle", "Alle"], ["urgent", "Urgent"], ["high", "Hoog"]].map(([k, l]) => (
          <FilterButton key={`p-${k}`} active={prioFilter === k} onClick={() => setPrioFilter(k)}>{l}</FilterButton>
        ))}
      </div>

      {/* Quick Add */}
      <form
        onSubmit={e => { e.preventDefault(); handleQuickAdd(); }}
        className="mb-4"
      >
        <Input
          value={quickAdd}
          onChange={e => setQuickAdd(e.target.value)}
          placeholder="Nieuwe taak... (Enter om toe te voegen)"
          className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"
        />
      </form>

      {/* Task List */}
      {isLoading ? (
        <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>
      ) : filtered.length === 0 ? (
        <ErpCard className="p-8 text-center text-erp-text3 text-sm">Geen taken gevonden</ErpCard>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <ErpCard
              key={task.id}
              className={cn("p-4", urgencyBorder(task.urgency))}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => toggleDone.mutate({ id: task.id, done: task.status !== "done" })}
                  className="w-4 h-4 mt-1 rounded border-erp-border1 accent-erp-blue cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-[13px] font-semibold", task.status === "done" ? "text-erp-text3 line-through" : "text-erp-text0")}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-[12px] text-erp-text2 mt-0.5 truncate">{task.description}</div>
                  )}
                  {(task.project_name || task.company_name) && (
                    <div className="flex gap-1.5 mt-2">
                      {task.project_name && <Chip>{task.project_name}</Chip>}
                      {task.company_name && <Chip>{task.company_name}</Chip>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Dot color={priorityColors[task.priority] || priorityColors.medium} size={8} />
                  {task.due_date && (
                    <span className={cn("text-[11px]", task.urgency === "overdue" ? "text-erp-red font-semibold" : "text-erp-text3")}>
                      {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: nl })}
                    </span>
                  )}
                  {task.assigned_to_name && (
                    <Avatar name={task.assigned_to_name} size={24} />
                  )}
                </div>
              </div>
            </ErpCard>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">Nieuwe taak</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-erp-text2 text-xs mb-1 block">Titel *</label>
              <Input value={fTitle} onChange={e => setFTitle(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
            </div>
            <div>
              <label className="text-erp-text2 text-xs mb-1 block">Beschrijving</label>
              <Textarea value={fDesc} onChange={e => setFDesc(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-erp-text2 text-xs mb-1 block">Prioriteit</label>
                <Select value={fPriority} onValueChange={setFPriority}>
                  <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-erp-bg2 border-erp-border0">
                    {Object.entries(priorityLabels).map(([k, l]) => (
                      <SelectItem key={k} value={k} className="text-erp-text0 text-sm focus:bg-erp-hover">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-erp-text2 text-xs mb-1 block">Deadline</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-start bg-erp-bg3 border border-erp-border1 text-erp-text0 text-sm rounded-md px-3 py-2 h-10">
                      {fDueDate ? format(fDueDate, "d MMM yyyy") : "Kies datum"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-erp-bg2 border-erp-border0" align="start">
                    <Calendar mode="single" selected={fDueDate} onSelect={setFDueDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <label className="text-erp-text2 text-xs mb-1 block">Toegewezen aan</label>
              <Select value={fAssignedTo} onValueChange={setFAssignedTo}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                  <SelectValue placeholder="Selecteer..." />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  {members.map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-erp-text0 text-sm focus:bg-erp-hover">
                      {(m.profiles as any)?.full_name || (m.profiles as any)?.email || m.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-erp-text2 text-xs mb-1 block">Project</label>
              <Select value={fProjectId} onValueChange={setFProjectId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                  <SelectValue placeholder="— Geen —" />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ErpButton primary onClick={handleCreate} disabled={!fTitle.trim()}>
              Taak aanmaken
            </ErpButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
