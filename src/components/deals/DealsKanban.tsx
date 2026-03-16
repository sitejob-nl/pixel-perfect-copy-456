import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { useUpdateDeal, DealWithRelations } from "@/hooks/useDeals";
import { toast } from "sonner";
import DealsKanbanColumn from "./DealsKanbanColumn";
import DealWonDialog from "./DealWonDialog";
import DealLostDialog from "./DealLostDialog";
import type { Database } from "@/integrations/supabase/types";

type StageRow = Database["public"]["Tables"]["pipeline_stages"]["Row"];

interface Props {
  deals: DealWithRelations[];
  stages: StageRow[];
  taskCounts: Record<string, number>;
  onDealClick: (d: DealWithRelations) => void;
}

export default function DealsKanban({ deals, stages, taskCounts, onDealClick }: Props) {
  const updateDeal = useUpdateDeal();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [wonDeal, setWonDeal] = useState<DealWithRelations | null>(null);
  const [lostDeal, setLostDeal] = useState<DealWithRelations | null>(null);
  const [wonStageId, setWonStageId] = useState<string>("");
  const [lostStageId, setLostStageId] = useState<string>("");

  const dealsByStage = useMemo(() => {
    const map: Record<string, DealWithRelations[]> = {};
    stages.forEach(s => { map[s.id] = []; });
    deals.forEach(d => {
      if (map[d.stage_id]) map[d.stage_id].push(d);
    });
    return map;
  }, [deals, stages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    // Determine target stage: either a column id or a deal's stage
    let targetStageId = over.id as string;
    const isStage = stages.some(s => s.id === targetStageId);
    if (!isStage) {
      const targetDeal = deals.find(d => d.id === targetStageId);
      if (targetDeal) targetStageId = targetDeal.stage_id;
    }

    if (targetStageId === deal.stage_id) return;

    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    if (targetStage.is_won) {
      setWonDeal(deal);
      setWonStageId(targetStageId);
      return;
    }
    if (targetStage.is_lost) {
      setLostDeal(deal);
      setLostStageId(targetStageId);
      return;
    }

    updateDeal.mutate(
      { id: dealId, stage_id: targetStageId, updated_at: new Date().toISOString() },
      { onSuccess: () => toast.success(`Deal verplaatst naar ${targetStage.name}`) }
    );
  };

  const handleWon = (closedAt: string, _note: string) => {
    if (!wonDeal) return;
    updateDeal.mutate(
      { id: wonDeal.id, stage_id: wonStageId, closed_at: closedAt, updated_at: new Date().toISOString() },
      { onSuccess: () => toast.success("🎉 Deal gewonnen!") }
    );
    setWonDeal(null);
  };

  const handleLost = (reason: string) => {
    if (!lostDeal) return;
    updateDeal.mutate(
      { id: lostDeal.id, stage_id: lostStageId, closed_at: new Date().toISOString(), lost_reason: reason, updated_at: new Date().toISOString() },
      { onSuccess: () => toast.success("Deal als verloren gemarkeerd") }
    );
    setLostDeal(null);
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-[10px] overflow-x-auto pb-4">
          {stages.map(st => (
            <DealsKanbanColumn
              key={st.id}
              stageId={st.id}
              stageName={st.name}
              color={st.color ?? "#6b7280"}
              deals={dealsByStage[st.id] ?? []}
              isTerminal={!!(st.is_won || st.is_lost)}
              taskCounts={taskCounts}
              onDealClick={onDealClick}
            />
          ))}
        </div>
      </DndContext>

      <DealWonDialog
        open={!!wonDeal}
        dealTitle={wonDeal?.title ?? ""}
        onConfirm={handleWon}
        onCancel={() => setWonDeal(null)}
      />
      <DealLostDialog
        open={!!lostDeal}
        dealTitle={lostDeal?.title ?? ""}
        onConfirm={handleLost}
        onCancel={() => setLostDeal(null)}
      />
    </>
  );
}
