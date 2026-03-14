import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCreateDeal, usePipelineStages } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useProjects } from "@/hooks/useProjects";
import { useOrgMembers } from "@/hooks/useTeam";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Icons } from "./ErpIcons";

export default function CreateDealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [probability, setProbability] = useState("");
  const [expectedClose, setExpectedClose] = useState<Date | undefined>();
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const createDeal = useCreateDeal();
  const { data: org } = useOrganization();
  const { data: stages = [] } = usePipelineStages();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: projects = [] } = useProjects();
  const { data: membersData } = useOrgMembers();
  const members = membersData?.members ?? [];
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.organization_id || !title.trim() || !stageId) return;
    try {
      await createDeal.mutateAsync({
        organization_id: org.organization_id,
        title: title.trim(),
        value: value ? parseFloat(value) : null,
        stage_id: stageId,
        contact_id: contactId || null,
        company_id: companyId || null,
        probability: probability ? parseInt(probability) : null,
        expected_close: expectedClose ? format(expectedClose, "yyyy-MM-dd") : null,
        description: description || null,
        project_id: projectId || null,
        assigned_to: assignedTo || null,
      });
      toast({ title: "Deal aangemaakt" });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("limit reached")) {
        toast({ title: "Plan limiet bereikt", description: "Upgrade je plan om meer deals toe te voegen.", variant: "destructive" });
      } else {
        toast({ title: "Fout", description: err.message, variant: "destructive" });
      }
    }
  };

  const resetForm = () => {
    setTitle(""); setValue(""); setStageId(""); setContactId(""); setCompanyId("");
    setProbability(""); setExpectedClose(undefined); setDescription(""); setProjectId(""); setAssignedTo("");
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
            <label className="block text-xs font-medium text-erp-text1 mb-1">Titel</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Waarde (€)</label>
              <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Kans (%)</label>
              <input type="number" min="0" max="100" value={probability} onChange={e => setProbability(e.target.value)} className={inputClass} placeholder="50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Fase</label>
            <Select value={stageId} onValueChange={setStageId} required>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0">
                <SelectValue placeholder="Selecteer fase" />
              </SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0">
                {stages.filter(s => !s.is_won && !s.is_lost).map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Verwachte sluitdatum</label>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className={`${inputClass} text-left flex items-center justify-between`}>
                  {expectedClose ? format(expectedClose, "d MMM yyyy", { locale: nl }) : <span className="text-erp-text3">Selecteer datum</span>}
                  <Icons.Calendar className="w-4 h-4 text-erp-text3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0" align="start">
                <Calendar mode="single" selected={expectedClose} onSelect={setExpectedClose} locale={nl} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Bedrijf</label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0">
                <SelectValue placeholder="— Optioneel —" />
              </SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0 max-h-[200px]">
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Contact</label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0">
                <SelectValue placeholder="— Optioneel —" />
              </SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0 max-h-[200px]">
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Toegewezen aan</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0">
                <SelectValue placeholder="— Optioneel —" />
              </SelectTrigger>
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
            <label className="block text-xs font-medium text-erp-text1 mb-1">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0">
                <SelectValue placeholder="— Optioneel —" />
              </SelectTrigger>
              <SelectContent className="bg-erp-bg3 border-erp-border0 max-h-[200px]">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-erp-text0 text-sm focus:bg-erp-hover">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Omschrijving</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} min-h-[60px]`} />
          </div>
          <button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50 mt-2"
          >
            {createDeal.isPending ? "Opslaan..." : "Deal aanmaken"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
