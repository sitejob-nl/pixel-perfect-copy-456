import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateDeal } from "@/hooks/useDeals";
import { usePipelineStages } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export default function CreateDealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");

  const createDeal = useCreateDeal();
  const { data: org } = useOrganization();
  const { data: stages = [] } = usePipelineStages();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
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
      });
      toast({ title: "Deal aangemaakt" });
      setTitle(""); setValue(""); setStageId(""); setContactId(""); setCompanyId("");
      onOpenChange(false);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("limit reached")) {
        toast({ title: "Plan limiet bereikt", description: "Upgrade je plan om meer deals toe te voegen.", variant: "destructive" });
      } else {
        toast({ title: "Fout", description: err.message, variant: "destructive" });
      }
    }
  };

  const selectClass = "w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 outline-none focus:border-erp-blue transition-colors";
  const inputClass = selectClass;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuwe deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Titel</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Waarde (€)</label>
            <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Fase</label>
            <select value={stageId} onChange={e => setStageId(e.target.value)} required className={selectClass}>
              <option value="">Selecteer fase</option>
              {stages.filter(s => !s.is_won && !s.is_lost).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Contact</label>
            <select value={contactId} onChange={e => setContactId(e.target.value)} className={selectClass}>
              <option value="">— Optioneel —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text1 mb-1">Bedrijf</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={selectClass}>
              <option value="">— Optioneel —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
