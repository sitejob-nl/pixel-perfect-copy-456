import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useConvertProspect } from "@/hooks/useProspectKanban";
import { usePipelineStages } from "@/hooks/useDeals";
import { useOrgMembers } from "@/hooks/useTeam";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ProspectLead } from "@/hooks/useProspectKanban";

interface Props {
  lead: ProspectLead | null;
  open: boolean;
  onClose: () => void;
}

export default function ProspectConvertDialog({ lead, open, onClose }: Props) {
  const convertMutation = useConvertProspect();
  const { data: stages } = usePipelineStages();
  const { data: members } = useTeamMembers();

  const [dealValue, setDealValue] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  if (!lead) return null;

  const defaultStageId = stages?.[0]?.id;

  const handleConvert = async () => {
    try {
      const params: any = { p_prospect_lead_id: lead.id };
      if (stageId) params.p_deal_stage_id = stageId;
      else if (defaultStageId) params.p_deal_stage_id = defaultStageId;
      if (dealValue) params.p_deal_value = parseFloat(dealValue);
      if (assignedTo) params.p_assigned_to = assignedTo;

      const result = await convertMutation.mutateAsync(params);
      toast.success("Geconverteerd! Deal aangemaakt", {
        action: { label: "Bekijk deals", onClick: () => window.location.href = "/pipeline" },
      });
      onClose();
      setDealValue("");
      setStageId("");
      setAssignedTo("");
    } catch (e: any) {
      toast.error(e.message || "Fout bij converteren");
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Prospect converteren naar Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead info */}
          <div className="bg-erp-bg3 rounded-lg p-3 space-y-1">
            <div className="text-[13px] font-semibold text-erp-text0">{lead.company_name}</div>
            {lead.contact_name && <div className="text-[12px] text-erp-text2">{lead.contact_name}</div>}
            {lead.score != null && lead.score > 0 && (
              <div className="text-[12px] text-erp-text2">Score: {lead.score}</div>
            )}
          </div>

          {/* Deal value */}
          <div className="space-y-2">
            <Label className="text-erp-text1 text-[12px]">Dealwaarde (optioneel)</Label>
            <Input
              type="number"
              value={dealValue}
              onChange={e => setDealValue(e.target.value)}
              placeholder="0.00"
              className="bg-erp-bg3 border-erp-border0 text-erp-text0"
            />
          </div>

          {/* Pipeline stage */}
          {stages && stages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Pipeline stage</Label>
              <Select value={stageId || defaultStageId || ""} onValueChange={setStageId}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-erp-text0">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assigned to */}
          {members && members.length > 0 && (
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Toegewezen aan (optioneel)</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0">
                  <SelectValue placeholder="Selecteer..." />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  {members.map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-erp-text0">
                      {m.profiles?.full_name || m.profiles?.email || m.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <ErpButton onClick={onClose}>Annuleren</ErpButton>
          <ErpButton primary onClick={handleConvert} disabled={convertMutation.isPending}>
            {convertMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Converteren
          </ErpButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
