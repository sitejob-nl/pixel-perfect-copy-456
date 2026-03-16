import { useState, useMemo } from "react";
import { PageHeader, ErpButton, ErpCard } from "@/components/erp/ErpPrimitives";
import { useDeals, usePipelineStages, DealWithRelations } from "@/hooks/useDeals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DealsKanban from "@/components/deals/DealsKanban";
import DealsTable from "@/components/deals/DealsTable";
import DealDetailSheet from "@/components/deals/DealDetailSheet";
import NewDealDialog from "@/components/deals/NewDealDialog";
import { TrendingUp, Kanban, Table, Plus } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v);

export default function DealsPage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealWithRelations | null>(null);
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages();

  // Fetch open task counts per deal
  const { data: taskCounts = {} } = useQuery({
    queryKey: ["deal-task-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("deal_id")
        .not("deal_id", "is", null)
        .neq("status", "done");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(t => {
        if (t.deal_id) counts[t.deal_id] = (counts[t.deal_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  const isLoading = dealsLoading || stagesLoading;

  // Pipeline stats (only open deals = not won/lost)
  const openDeals = useMemo(() => {
    const terminalIds = new Set(stages.filter(s => s.is_won || s.is_lost).map(s => s.id));
    return deals.filter(d => !terminalIds.has(d.stage_id));
  }, [deals, stages]);

  const totalValue = openDeals.reduce((a, d) => a + (d.value ? Number(d.value) : 0), 0);
  const weightedValue = openDeals.reduce((a, d) => {
    const prob = d.probability ?? d.pipeline_stages?.probability ?? 50;
    return a + (d.value ? Number(d.value) * (prob / 100) : 0);
  }, 0);

  return (
    <div className="animate-fade-up max-w-[1400px]">
      <PageHeader
        title="Deals"
        desc={isLoading ? "Laden..." : `${openDeals.length} open deals · ${eur(totalValue)} pipeline · ${eur(Math.round(weightedValue))} gewogen`}
      >
        <ToggleGroup type="single" value={view} onValueChange={v => v && setView(v as any)} className="bg-erp-bg3 rounded-lg p-0.5 border border-erp-border0">
          <ToggleGroupItem value="kanban" className="text-xs px-3 py-1.5 data-[state=on]:bg-erp-bg2 data-[state=on]:text-erp-text0 text-erp-text3 rounded-md">
            <Kanban className="w-3.5 h-3.5 mr-1" /> Kanban
          </ToggleGroupItem>
          <ToggleGroupItem value="table" className="text-xs px-3 py-1.5 data-[state=on]:bg-erp-bg2 data-[state=on]:text-erp-text0 text-erp-text3 rounded-md">
            <Table className="w-3.5 h-3.5 mr-1" /> Tabel
          </ToggleGroupItem>
        </ToggleGroup>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Nieuwe deal
        </ErpButton>
      </PageHeader>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Deals laden...</ErpCard>}

      {!isLoading && view === "kanban" && (
        <DealsKanban deals={deals} stages={stages} taskCounts={taskCounts} onDealClick={setSelectedDeal} />
      )}

      {!isLoading && view === "table" && (
        <DealsTable deals={deals} stages={stages} onDealClick={setSelectedDeal} />
      )}

      <NewDealDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <DealDetailSheet deal={selectedDeal} open={!!selectedDeal} onOpenChange={o => { if (!o) setSelectedDeal(null); }} />
    </div>
  );
}
