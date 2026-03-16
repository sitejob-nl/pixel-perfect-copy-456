import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const priorityOptions = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "Hoog" },
  { value: "medium", label: "Normaal" },
  { value: "low", label: "Laag" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (task: Record<string, any>) => void;
  members: { user_id: string; profiles: any }[];
  companies: { id: string; name: string }[];
  contacts: { id: string; first_name: string; last_name: string | null }[];
  deals: { id: string; title: string }[];
  currentUserId?: string;
}

export default function NewTaskDialog({ open, onOpenChange, onCreate, members, companies, contacts, deals, currentUserId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assignedTo, setAssignedTo] = useState(currentUserId || "");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [dealId, setDealId] = useState("");

  const reset = () => {
    setTitle(""); setDescription(""); setPriority("medium"); setDueDate(undefined);
    setAssignedTo(currentUserId || ""); setCompanyId(""); setContactId(""); setDealId("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description || null,
      priority,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      assigned_to: assignedTo || null,
      company_id: companyId || null,
      contact_id: contactId || null,
      deal_id: dealId || null,
      status: "todo",
    });
    reset();
    onOpenChange(false);
  };

  const inputClass = "bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuwe taak</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Titel *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Beschrijving</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className={cn(inputClass, "min-h-[60px]")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-erp-text2 mb-1 block">Prioriteit</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {priorityOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-erp-text0 text-sm focus:bg-erp-hover">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-erp-text2 mb-1 block">Deadline</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={cn("w-full flex items-center justify-between rounded-md border px-3 py-2 h-10", inputClass)}>
                    {dueDate ? format(dueDate, "d MMM", { locale: nl }) : <span className="text-erp-text3">—</span>}
                    <CalendarIcon className="w-4 h-4 text-erp-text3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={nl} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Toegewezen aan</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="— Optioneel —" /></SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0">
                {members.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-erp-text0 text-sm focus:bg-erp-hover">
                    {m.profiles?.full_name || m.profiles?.email || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-erp-text2 mb-1 block">Bedrijf</label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className={cn(inputClass, "text-[12px]")}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-erp-text2 mb-1 block">Contact</label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className={cn(inputClass, "text-[12px]")}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-erp-text0 text-sm focus:bg-erp-hover">
                      {c.first_name} {c.last_name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-erp-text2 mb-1 block">Deal</label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger className={cn(inputClass, "text-[12px]")}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {deals.map(d => (
                    <SelectItem key={d.id} value={d.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <button type="submit" className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors">
            Taak aanmaken
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
