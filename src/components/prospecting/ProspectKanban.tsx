import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { KanbanStage, ProspectLead, KanbanData } from "@/hooks/useProspectKanban";
import { useUpdateProspectStatus } from "@/hooks/useProspectKanban";
import ProspectKanbanColumn from "./ProspectKanbanColumn";
import ProspectCard from "./ProspectCard";
import ProspectDetailSheet from "./ProspectDetailSheet";
import ProspectConvertDialog from "./ProspectConvertDialog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  data: KanbanData;
}

export default function ProspectKanban({ data }: Props) {
  const { stages, leads } = data;
  const updateStatus = useUpdateProspectStatus();
  const qc = useQueryClient();

  const [activeLead, setActiveLead] = useState<ProspectLead | null>(null);
  const [detailLead, setDetailLead] = useState<ProspectLead | null>(null);
  const [convertLead, setConvertLead] = useState<ProspectLead | null>(null);
  const [rejectLead, setRejectLead] = useState<{ lead: ProspectLead; status: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Optimistic state
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const leadsByStatus = useMemo(() => {
    const map: Record<string, ProspectLead[]> = {};
    for (const stage of stages) {
      map[stage.status_key] = [];
    }
    for (const lead of leads) {
      const effectiveStatus = optimisticMoves[lead.id] || lead.status;
      if (map[effectiveStatus]) {
        map[effectiveStatus].push({ ...lead, status: effectiveStatus });
      }
    }
    return map;
  }, [stages, leads, optimisticMoves]);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Determine target status
    let targetStatus = over.id as string;
    // If dropped on another card, find its column
    if (!stages.find(s => s.status_key === targetStatus)) {
      const targetLead = leads.find(l => l.id === targetStatus);
      if (targetLead) targetStatus = optimisticMoves[targetLead.id] || targetLead.status;
      else return;
    }

    const currentStatus = optimisticMoves[leadId] || lead.status;
    if (targetStatus === currentStatus) return;

    // Terminal checks
    if (targetStatus === "converted") {
      setConvertLead(lead);
      return;
    }
    if (targetStatus === "not_interested" || targetStatus === "disqualified") {
      setRejectLead({ lead, status: targetStatus });
      setRejectNote("");
      return;
    }

    // Optimistic update
    setOptimisticMoves(prev => ({ ...prev, [leadId]: targetStatus }));
    try {
      await updateStatus.mutateAsync({ leadId, status: targetStatus });
      toast.success("Status bijgewerkt");
    } catch {
      toast.error("Fout bij bijwerken status");
    } finally {
      setOptimisticMoves(prev => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
      qc.invalidateQueries({ queryKey: ["prospect-kanban"] });
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectLead) return;
    const { lead, status } = rejectLead;
    try {
      // Update notes if provided, plus status
      const updates: any = { status };
      if (rejectNote.trim()) updates.notes = (lead.notes ? lead.notes + "\n" : "") + rejectNote.trim();
      
      const { error } = await (await import("@/integrations/supabase/client")).supabase
        .from("prospect_leads")
        .update(updates)
        .eq("id", lead.id);
      if (error) throw error;
      toast.success("Prospect bijgewerkt");
      qc.invalidateQueries({ queryKey: ["prospect-kanban"] });
    } catch {
      toast.error("Fout bij bijwerken");
    }
    setRejectLead(null);
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {stages.map(stage => (
            <ProspectKanbanColumn
              key={stage.status_key}
              stage={stage}
              leads={leadsByStatus[stage.status_key] || []}
              onCardClick={setDetailLead}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="opacity-90 rotate-2 w-[280px]">
              <ProspectCard lead={activeLead} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Detail Sheet */}
      <ProspectDetailSheet
        lead={detailLead}
        stages={stages}
        open={!!detailLead}
        onClose={() => setDetailLead(null)}
        onConvert={(l) => { setDetailLead(null); setConvertLead(l); }}
        onReject={(l, status) => { setDetailLead(null); setRejectLead({ lead: l, status }); setRejectNote(""); }}
      />

      {/* Convert Dialog */}
      <ProspectConvertDialog
        lead={convertLead}
        open={!!convertLead}
        onClose={() => setConvertLead(null)}
      />

      {/* Reject Dialog */}
      <Dialog open={!!rejectLead} onOpenChange={v => !v && setRejectLead(null)}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">
              {rejectLead?.status === "not_interested" ? "Niet geïnteresseerd" : "Diskwalificeren"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-erp-text2">
            Weet je zeker dat je <strong>{rejectLead?.lead.company_name}</strong> wilt markeren als{" "}
            {rejectLead?.status === "not_interested" ? "niet geïnteresseerd" : "gediskwalificeerd"}?
          </p>
          <Textarea
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="Optionele notitie..."
            className="bg-erp-bg3 border-erp-border0 text-erp-text0"
          />
          <DialogFooter>
            <ErpButton onClick={() => setRejectLead(null)}>Annuleren</ErpButton>
            <ErpButton primary onClick={handleRejectConfirm}>Bevestigen</ErpButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
