import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { useProjects } from "@/hooks/useProjects";
import { useDeals } from "@/hooks/useDeals";
import { useProjectPlanTemplates, useGenerateProjectPlan } from "@/hooks/useProjectPlans";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

interface Props { open: boolean; onOpenChange: (o: boolean) => void }

export default function PlanWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dealId, setDealId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [weeks, setWeeks] = useState<number | "">("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [amount, setAmount] = useState<number | "">("");

  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const { data: deals = [] } = useDeals();
  const { data: templates = [] } = useProjectPlanTemplates();
  const { data: org } = useOrganization();
  const generate = useGenerateProjectPlan();
  const navigate = useNavigate();

  const selectedCompany = companies.find(c => c.id === companyId);
  const selectedTemplate = templates.find(t => t.id === templateId);
  const filteredContacts = contacts.filter(c => !companyId || c.company_id === companyId);
  const filteredProjects = projects.filter(p => !companyId || p.company_id === companyId);
  const filteredDeals = deals.filter(d => !companyId || d.company_id === companyId);

  const reset = () => {
    setStep(1); setCompanyId(""); setContactId(""); setProjectId(""); setDealId(""); setTemplateId(""); setTitle(""); setWeeks(""); setStartDate(undefined); setAmount("");
  };

  const goToStep2 = () => {
    if (!templateId) { toast({ title: "Kies een template", variant: "destructive" }); return; }
    setTitle(`Projectplan ${selectedCompany?.name || ""}`);
    setWeeks(selectedTemplate?.default_timeline_weeks ?? "");
    setStep(2);
  };

  const handleCreate = async () => {
    if (!org?.organization_id || !templateId) return;
    try {
      const result = await generate.mutateAsync({
        p_organization_id: org.organization_id,
        p_template_id: templateId,
        p_company_id: companyId || undefined,
        p_contact_id: contactId || undefined,
        p_project_id: projectId || undefined,
        p_deal_id: dealId || undefined,
        p_title: title || undefined,
      });
      toast({ title: `Plan aangemaakt met ${result.sections_created} secties` });
      onOpenChange(false);
      reset();
      navigate(`/project-plans/${result.plan_id}`);
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg bg-erp-bg2 border-erp-border0">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">
            Nieuw projectplan — Stap {step}/2
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-erp-text1 text-xs">Bedrijf</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0"><SelectValue placeholder="Kies bedrijf..." /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {companies.map(c => <SelectItem key={c.id} value={c.id} className="text-erp-text0 focus:bg-erp-hover">{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-erp-text1 text-xs">Contactpersoon</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0"><SelectValue placeholder="Kies contact..." /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {filteredContacts.map(c => <SelectItem key={c.id} value={c.id} className="text-erp-text0 focus:bg-erp-hover">{c.first_name} {c.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-erp-text1 text-xs">Project (optioneel)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0"><SelectValue placeholder="Kies project..." /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {filteredProjects.map(p => <SelectItem key={p.id} value={p.id} className="text-erp-text0 focus:bg-erp-hover">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-erp-text1 text-xs">Deal (optioneel)</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0"><SelectValue placeholder="Kies deal..." /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {filteredDeals.map(d => <SelectItem key={d.id} value={d.id} className="text-erp-text0 focus:bg-erp-hover">{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-erp-text1 text-xs">Template *</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0"><SelectValue placeholder="Kies template..." /></SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {templates.map(t => <SelectItem key={t.id} value={t.id} className="text-erp-text0 focus:bg-erp-hover">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedTemplate?.description && (
                <p className="text-xs text-erp-text3 mt-1">{selectedTemplate.description} • {selectedTemplate.default_timeline_weeks} weken</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={goToStep2} size="sm">Volgende</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-erp-text1 text-xs">Titel</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-erp-text1 text-xs">Doorlooptijd (weken)</Label>
                <Input type="number" value={weeks} onChange={e => setWeeks(e.target.value ? Number(e.target.value) : "")} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
              </div>
              <div>
                <Label className="text-erp-text1 text-xs">Totaalbedrag (€)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : "")} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
              </div>
            </div>
            <div>
              <Label className="text-erp-text1 text-xs">Startdatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-erp-bg3 border-erp-border0 text-erp-text0">
                    <CalendarIcon className="w-4 h-4 mr-2 text-erp-text3" />
                    {startDate ? format(startDate, "d MMMM yyyy", { locale: nl }) : "Kies datum..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={nl} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} size="sm">Terug</Button>
              <Button onClick={handleCreate} size="sm" disabled={generate.isPending}>
                {generate.isPending ? "Aanmaken..." : "Aanmaken"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
