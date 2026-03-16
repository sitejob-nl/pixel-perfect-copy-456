import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dealId?: string | null;
  companyId?: string | null;
  contactId?: string | null;
}

export default function AddTaskDialog({ open, onOpenChange, dealId, companyId, contactId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assignedTo, setAssignedTo] = useState("");
  const { data: org } = useOrganization();
  const { user } = useAuth();
  const { data: membersData } = useOrgMembers();
  const members = membersData?.members ?? [];
  const qc = useQueryClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.organization_id || !title.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      organization_id: org.organization_id,
      title: title.trim(),
      description: description || null,
      priority,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      assigned_to: assignedTo || null,
      created_by: user?.id ?? null,
      deal_id: dealId ?? null,
      company_id: companyId ?? null,
      contact_id: contactId ?? null,
      status: "todo",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Taak aangemaakt");
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["company-tasks"] });
    qc.invalidateQueries({ queryKey: ["contact-tasks"] });
    onOpenChange(false);
    setTitle(""); setDescription(""); setPriority("medium"); setDueDate(undefined); setAssignedTo("");
  };

  const inputClass = "w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuwe taak</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Titel *</label>
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
  );
}
