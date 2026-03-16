import { useState } from "react";
import { useActivities, useCreateActivity } from "@/hooks/useActivities";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const TYPES = ["call", "email", "meeting", "note", "task", "whatsapp"];

export default function DealActivitiesTab({ dealId, contactId, companyId }: { dealId: string; contactId?: string | null; companyId?: string | null }) {
  const { data: activities = [] } = useActivities({ dealId });
  const createActivity = useCreateActivity();
  const { data: org } = useOrganization();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actType, setActType] = useState("note");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.organization_id || !subject.trim()) return;
    try {
      await createActivity.mutateAsync({
        organization_id: org.organization_id,
        user_id: user?.id ?? null,
        deal_id: dealId,
        contact_id: contactId ?? null,
        company_id: companyId ?? null,
        activity_type: actType,
        subject: subject.trim(),
        description: description || null,
        outcome: outcome || null,
        status: "completed",
      });
      toast.success("Activiteit gelogd");
      setDialogOpen(false);
      setSubject(""); setDescription(""); setOutcome("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const inputClass = "w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors";

  return (
    <div className="space-y-3">
      <ErpButton onClick={() => setDialogOpen(true)}>
        <Icons.Plus className="w-3.5 h-3.5" /> Activiteit loggen
      </ErpButton>

      {activities.length === 0 && <p className="text-sm text-erp-text3 py-4">Nog geen activiteiten</p>}

      <div className="space-y-2">
        {activities.map(a => (
          <div key={a.id} className="bg-erp-bg3 rounded-lg p-3 border border-erp-border0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-erp-text2 uppercase">{a.activity_type}</span>
              <span className="text-[10px] text-erp-text3">{format(new Date(a.created_at), "d MMM HH:mm", { locale: nl })}</span>
            </div>
            <div className="text-[13px] font-medium text-erp-text0 mt-1">{a.subject}</div>
            {a.description && <div className="text-xs text-erp-text2 mt-0.5">{a.description}</div>}
            {a.outcome && <div className="text-xs text-erp-green mt-0.5">Uitkomst: {a.outcome}</div>}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">Activiteit loggen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Type</label>
              <Select value={actType} onValueChange={setActType}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg3 border-erp-border0">
                  {TYPES.map(t => <SelectItem key={t} value={t} className="text-erp-text0 text-sm focus:bg-erp-hover capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Onderwerp</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Beschrijving</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-erp-text1 mb-1">Uitkomst</label>
              <input value={outcome} onChange={e => setOutcome(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" disabled={createActivity.isPending} className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50">
              {createActivity.isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
