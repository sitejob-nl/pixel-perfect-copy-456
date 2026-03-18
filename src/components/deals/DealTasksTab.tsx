import { useState } from "react";
import { useDealTasks } from "@/hooks/useDeals";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

export default function DealTasksTab({ dealId }: { dealId: string }) {
  const { data: tasks = [] } = useDealTasks(dealId);
  const { data: org } = useOrganization();
  const { user } = useAuth();
  const { data: membersData } = useOrgMembers();
  const members = membersData?.members ?? [];
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assignedTo, setAssignedTo] = useState("");

  const toggleTask = async (taskId: string, completed: boolean) => {
    const updates = completed
      ? { status: "completed" as const, completed_at: new Date().toISOString(), completed_by: user?.id }
      : { status: "todo" as const, completed_at: null, completed_by: null };
    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["deal-tasks", dealId] });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.organization_id || !title.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      organization_id: org.organization_id,
      deal_id: dealId,
      title: title.trim(),
      description: description || null,
      priority,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      assigned_to: assignedTo || null,
      created_by: user?.id ?? null,
      status: "todo",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Taak aangemaakt");
    qc.invalidateQueries({ queryKey: ["deal-tasks", dealId] });
    setDialogOpen(false);
    setTitle(""); setDescription(""); setPriority("medium"); setDueDate(undefined); setAssignedTo("");
  };

  const inputClass = "w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors";
  const priorityColors: Record<string, string> = { high: "text-erp-red", medium: "text-erp-orange", low: "text-erp-text3" };

  return (
    <div className="space-y-3">
      <ErpButton onClick={() => setDialogOpen(true)}>
        <Icons.Plus className="w-3.5 h-3.5" /> Taak toevoegen
      </ErpButton>

      {tasks.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen taken</p>}

      <div className="space-y-1">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 bg-erp-bg3 rounded-lg p-2.5 border border-erp-border0">
            <input
              type="checkbox"
              checked={t.status === "completed"}
              onChange={e => toggleTask(t.id, e.target.checked)}
              className="rounded border-erp-border1 accent-erp-blue"
            />
            <div className="flex-1 min-w-0">
              <span className={cn("text-[13px]", t.status === "completed" ? "line-through text-erp-text3" : "text-erp-text0")}>{t.title}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[10px] font-medium uppercase", priorityColors[t.priority ?? "medium"])}>{t.priority}</span>
                {t.due_date && <span className="text-[10px] text-erp-text3">{format(new Date(t.due_date), "d MMM", { locale: nl })}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">Nieuwe taak</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Titel</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Beschrijving</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-erp-text1 mb-1">Prioriteit</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-erp-bg3 border-erp-border0">
                    <SelectItem value="high" className="text-erp-text0 text-sm focus:bg-erp-hover">Hoog</SelectItem>
                    <SelectItem value="medium" className="text-erp-text0 text-sm focus:bg-erp-hover">Normaal</SelectItem>
                    <SelectItem value="low" className="text-erp-text0 text-sm focus:bg-erp-hover">Laag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-erp-text1 mb-1">Deadline</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={`${inputClass} text-left flex items-center justify-between`}>
                      {dueDate ? format(dueDate, "d MMM", { locale: nl }) : <span className="text-erp-text3">—</span>}
                      <CalendarIcon className="w-4 h-4 text-erp-text3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={nl} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Toegewezen aan</label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0"><SelectValue placeholder="— Optioneel —" /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {members.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-erp-text0 text-sm focus:bg-erp-hover">
                      {m.profiles?.full_name ?? m.profiles?.email ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button type="submit" className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors">
              Taak aanmaken
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
