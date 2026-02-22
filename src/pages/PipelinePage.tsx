import { PageHeader, ErpButton, ErpCard, Avatar, Dot, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { deals, pipelineStages } from "@/data/mockData";

export default function PipelinePage() {
  return (
    <div className="animate-fade-up max-w-[1400px]">
      <PageHeader title="Sales Pipeline" desc={`€${fmt(deals.reduce((a, d) => a + d.val, 0))} · ${deals.length} deals`}>
        <ErpButton><Icons.File className="w-4 h-4" /> Export</ErpButton>
        <ErpButton primary><Icons.Plus className="w-4 h-4" /> Nieuwe deal</ErpButton>
      </PageHeader>

      <div className="flex gap-[10px] overflow-x-auto pb-4">
        {pipelineStages.map(st => {
          const ds = deals.filter(d => d.stage === st.name);
          const total = ds.reduce((a, d) => a + d.val, 0);
          return (
            <div key={st.name} className="min-w-[244px] max-w-[244px] flex-shrink-0">
              <div
                className="flex items-center justify-between px-3 py-[9px] rounded-[10px] mb-2"
                style={{ background: `${st.color}0c` }}
              >
                <span className="text-[13px] font-semibold flex items-center gap-[7px]" style={{ color: st.color }}>
                  <Dot color={st.color} /> {st.name}
                  <span className="text-[11px] font-bold px-[7px] py-[1px] rounded-[10px]" style={{ background: `${st.color}20` }}>
                    {ds.length}
                  </span>
                </span>
                {total > 0 && <span className="text-[11px] text-erp-text3">€{fmt(total)}</span>}
              </div>
              <div className="flex flex-col gap-[6px]">
                {ds.map(d => (
                  <ErpCard key={d.id} className="p-[14px] cursor-pointer" hover>
                    <div className="text-[13px] font-semibold text-erp-text0 mb-[3px]">{d.title}</div>
                    <div className="text-xs text-erp-text2 mb-[10px]">{d.co}</div>
                    <div className="text-base font-bold text-erp-text0">€{fmt(d.val)}</div>
                    <div className="h-[3px] bg-erp-bg4 rounded-sm mt-[10px] overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${d.prob}%`, background: st.color }} />
                    </div>
                    <div className="flex justify-between items-center mt-[10px]">
                      <span className="text-[11px] text-erp-text3">{d.days}d in fase</span>
                      <Avatar name={d.contact} id={d.id} size={22} />
                    </div>
                  </ErpCard>
                ))}
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
    </div>
  );
}
