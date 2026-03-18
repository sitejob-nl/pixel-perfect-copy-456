import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/erp/ErpPrimitives";
import EntityAttachments from "@/components/shared/EntityAttachments";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/hooks/useTasks";

const statusOptions = [
  { value: "todo", label: "Te doen" },
  { value: "in_progress", label: "Bezig" },
  { value: "completed", label: "Afgerond" },
];
const priorityOptions = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "Hoog" },
  { value: "medium", label: "Normaal" },
  { value: "low", label: "Laag" },
];

interface Props {
  task: TaskWithRelations | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdate: (id: string, updates: Record<string, any>) => void;
  onDelete: (id: string) => void;
  members: { user_id: string; profiles: any }[];
  companies: { id: string; name: string }[];
  contacts: { id: string; first_name: string; last_name: string | null }[];
  deals: { id: string; title: string }[];
}

export default function TaskDetailPanel({ task, open, onOpenChange, onUpdate, onDelete, members, companies, contacts, deals }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
    }
  }, [task?.id]);

  if (!task) return null;

  const save = (field: string, value: any) => {
    onUpdate(task.id, { [field]: value });
  };

  const handleDelete = () => {
    if (confirm("Weet je zeker dat je deze taak wilt verwijderen?")) {
      onDelete(task.id);
      onOpenChange(false);
    }
  };

  const inputClass = "bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-erp-text0 sr-only">Taak details</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => title !== task.title && save("title", title)}
            className={cn(inputClass, "text-lg font-semibold h-auto py-2")}
          />

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-erp-text2 mb-1 block">Status</label>
              <Select value={task.status} onValueChange={v => save("status", v)}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {statusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-erp-text0 text-sm focus:bg-erp-hover">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-erp-text2 mb-1 block">Prioriteit</label>
              <Select value={task.priority} onValueChange={v => save("priority", v)}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {priorityOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-erp-text0 text-sm focus:bg-erp-hover">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Deadline</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn("w-full flex items-center justify-between rounded-md border px-3 py-2 h-10", inputClass)}>
                  {task.due_date ? format(new Date(task.due_date), "d MMM yyyy", { locale: nl }) : <span className="text-erp-text3">Geen deadline</span>}
                  <CalendarIcon className="w-4 h-4 text-erp-text3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0" align="start">
                <Calendar
                  mode="single"
                  selected={task.due_date ? new Date(task.due_date) : undefined}
                  onSelect={d => save("due_date", d ? format(d, "yyyy-MM-dd") : null)}
                  locale={nl}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Assigned to */}
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Toegewezen aan</label>
            <Select value={task.assigned_to || ""} onValueChange={v => save("assigned_to", v || null)}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="— Niemand —" /></SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0">
                {members.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-erp-text0 text-sm focus:bg-erp-hover">
                    {m.profiles?.full_name || m.profiles?.email || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Beschrijving</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => description !== (task.description || "") && save("description", description || null)}
              className={cn(inputClass, "min-h-[80px]")}
              placeholder="Voeg een beschrijving toe..."
            />
          </div>

          {/* Linked entities */}
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Bedrijf</label>
            <Select value={task.company_id || ""} onValueChange={v => save("company_id", v || null)}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="— Geen —" /></SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0">
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Contact</label>
            <Select value={task.contact_id || ""} onValueChange={v => save("contact_id", v || null)}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="— Geen —" /></SelectTrigger>
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
            <Select value={task.deal_id || ""} onValueChange={v => save("deal_id", v || null)}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="— Geen —" /></SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0">
                {deals.map(d => (
                  <SelectItem key={d.id} value={d.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{d.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Attachments */}
          <div>
            <label className="text-xs text-erp-text2 mb-1 block">Bestanden</label>
            <EntityAttachments entityType="task" entityId={task.id} />
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-erp-red text-sm hover:underline mt-6"
          >
            <Trash2 className="w-4 h-4" /> Taak verwijderen
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
