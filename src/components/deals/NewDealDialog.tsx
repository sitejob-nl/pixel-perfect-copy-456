import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDeal, usePipelineStages } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOrgMembers } from "@/hooks/useTeam";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewDealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [expectedClose, setExpectedClose] = useState<Date | undefined>();
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const createDeal = useCreateDeal();
  const { data: org } = useOrganization();
  const { data: stages = [] } = usePipelineStages();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: membersData } = useOrgMembers();
  const members = membersData?.members ?? [];

  // Default stage = Lead (sort_order 0)
  const defaultStageId = stages.find(s => s.sort_order === 0)?.id ?? "";

  // Filter contacts by selected company
  const filteredContacts = useMemo(() => {
    if (!companyId) return contacts;
    return contacts.filter(c => c.company_id === companyId);
  }, [contacts, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.organization_id || !title.trim()) return;
    try {
      await createDeal.mutateAsync({
        organization_id: org.organization_id,
        title: title.trim(),
        value: value ? parseFloat(value) : null,
        stage_id: stageId || defaultStageId,
        contact_id: contactId || null,
        company_id: companyId || null,
        expected_close: expectedClose ? format(expectedClose, "yyyy-MM-dd") : null,
        description: description || null,
        assigned_to: assignedTo || null,
      });
      toast.success("Deal aangemaakt");
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setTitle(""); setValue(""); setStageId(""); setContactId(""); setCompanyId("");
    setExpectedClose(undefined); setDescription(""); setAssignedTo("");
  };

  const inputClass = "w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuwe deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Titel *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className={inputClass} placeholder="Bijv. Website redesign Acme" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Waarde (€)</label>
              <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Fase</label>
              <Select value={stageId || defaultStageId} onValueChange={setStageId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {stages.filter(s => !s.is_won && !s.is_lost).map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Bedrijf</label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setContactId(""); }}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0"><SelectValue placeholder="— Optioneel —" /></SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0 max-h-[200px]">
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Contactpersoon</label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0"><SelectValue placeholder="— Optioneel —" /></SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0 max-h-[200px]">
                {filteredContacts.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Verwachte sluitdatum</label>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className={`${inputClass} text-left flex items-center justify-between`}>
                  {expectedClose ? format(expectedClose, "d MMM yyyy", { locale: nl }) : <span className="text-erp-text3">— Optioneel —</span>}
                  <CalendarIcon className="w-4 h-4 text-erp-text3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0" align="start">
                <Calendar mode="single" selected={expectedClose} onSelect={setExpectedClose} locale={nl} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Toegewezen aan</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0"><SelectValue placeholder="— Optioneel —" /></SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0 max-h-[200px]">
                {members.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-erp-text0 text-sm focus:bg-erp-hover">
                    {m.profiles?.full_name ?? m.profiles?.email ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Omschrijving</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm" />
          </div>
          <button type="submit" disabled={createDeal.isPending} className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50 mt-2">
            {createDeal.isPending ? "Opslaan..." : "Deal aanmaken"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
