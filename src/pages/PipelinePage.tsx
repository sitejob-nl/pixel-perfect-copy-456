import { useState } from "react";
import { PageHeader, ErpButton, ErpCard, Avatar, Dot, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useDeals, usePipelineStages, useUpdateDeal } from "@/hooks/useDeals";
import CreateDealDialog from "@/components/erp/CreateDealDialog";
import { differenceInDays } from "date-fns";

export default function PipelinePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages();
  const updateDeal = useUpdateDeal();

  const isLoading = dealsLoading || stagesLoading;
  const totalValue = deals.reduce((a, d) => a + (d.value ? Number(d.value) : 0), 0);

  const moveDeal = (dealId: string, newStageId: string) => {
    updateDeal.mutate({ id: dealId, stage_id: newStageId });
  };

  return (
    <div className="animate-fade-up max-w-[1400px]">
      <PageHeader title="Sales Pipeline" desc={isLoading ? "Laden..." : `€${fmt(totalValue)} · ${deals.length} deals`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuwe deal
        </ErpButton>
      </PageHeader>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Pipeline laden...</ErpCard>}

      {!isLoading && (
        <div className="flex gap-[10px] overflow-x-auto pb-4">
          {stages.map(st => {
            const ds = deals.filter(d => d.stage_id === st.id);
            const total = ds.reduce((a, d) => a + (d.value ? Number(d.value) : 0), 0);
            const color = st.color ?? "#6b7280";

            return (
              <div key={st.id} className="min-w-[244px] max-w-[244px] flex-shrink-0">
                <div
                  className="flex items-center justify-between px-3 py-[9px] rounded-[10px] mb-2"
                  style={{ background: `${color}0c` }}
                >
                  <span className="text-[13px] font-semibold flex items-center gap-[7px]" style={{ color }}>
                    <Dot color={color} /> {st.name}
                    <span className="text-[11px] font-bold px-[7px] py-[1px] rounded-[10px]" style={{ background: `${color}20` }}>
                      {ds.length}
                    </span>
                  </span>
                  {total > 0 && <span className="text-[11px] text-erp-text3">€{fmt(total)}</span>}
                </div>
                <div className="flex flex-col gap-[6px]">
                  {ds.map(d => {
                    const daysInStage = differenceInDays(new Date(), new Date(d.updated_at));
                    const contactName = d.contacts
                      ? `${d.contacts.first_name} ${d.contacts.last_name ?? ""}`.trim()
                      : "—";
                    const prob = d.probability ?? st.probability ?? 50;

                    return (
                      <ErpCard key={d.id} className="p-[14px] cursor-pointer" hover>
                        <div className="text-[13px] font-semibold text-erp-text0 mb-[3px]">{d.title}</div>
                        <div className="text-xs text-erp-text2 mb-[10px]">{d.companies?.name ?? "—"}</div>
                        <div className="text-base font-bold text-erp-text0">
                          €{fmt(d.value ? Number(d.value) : 0)}
                        </div>
                        <div className="h-[3px] bg-erp-bg4 rounded-sm mt-[10px] overflow-hidden">
                          <div className="h-full rounded-sm" style={{ width: `${prob}%`, background: color }} />
                        </div>
                        <div className="flex justify-between items-center mt-[10px]">
                          <span className="text-[11px] text-erp-text3">{daysInStage}d in fase</span>
                          <Avatar name={contactName} id={d.id.charCodeAt(0)} size={22} />
                        </div>
                        {/* Quick stage move buttons */}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {stages.filter(s => s.id !== st.id && !s.is_lost).slice(0, 3).map(s => (
                            <button
                              key={s.id}
                              onClick={(e) => { e.stopPropagation(); moveDeal(d.id, s.id); }}
                              className="text-[9px] px-[6px] py-[2px] rounded bg-erp-bg4 text-erp-text3 hover:text-erp-text0 hover:bg-erp-hover border-none cursor-pointer transition-colors"
                              title={`Verplaats naar ${s.name}`}
                            >
                              → {s.name}
                            </button>
                          ))}
                        </div>
                      </ErpCard>
                    );
                  })}
                  {ds.length === 0 && (
                    <div className="border border-dashed border-erp-border1 rounded-[10px] p-5 text-center text-erp-text3 text-xs">
                      Geen deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateDealDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
