import { useState, useMemo } from "react";
import { TH, TD, TR, Avatar, Badge, fmt } from "@/components/erp/ErpPrimitives";
import { FilterButton } from "@/components/erp/ErpPrimitives";
import { differenceInDays, format, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import type { DealWithRelations } from "@/hooks/useDeals";
import type { Database } from "@/integrations/supabase/types";

type StageRow = Database["public"]["Tables"]["pipeline_stages"]["Row"];

const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v);

interface Props {
  deals: DealWithRelations[];
  stages: StageRow[];
  onDealClick: (d: DealWithRelations) => void;
}

type SortKey = "value" | "stage" | "expected_close" | "created_at";

export default function DealsTable({ deals, stages, onDealClick }: Props) {
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");

  const toggleStageFilter = (id: string) => {
    setStageFilter(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const filtered = useMemo(() => {
    let result = stageFilter.length > 0 ? deals.filter(d => stageFilter.includes(d.stage_id)) : deals;
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "value": return (Number(b.value) || 0) - (Number(a.value) || 0);
        case "stage": return (a.pipeline_stages?.sort_order ?? 0) - (b.pipeline_stages?.sort_order ?? 0);
        case "expected_close": return (a.expected_close ?? "z").localeCompare(b.expected_close ?? "z");
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return result;
  }, [deals, stageFilter, sortKey]);

  const sortHeader = (key: SortKey, label: string) => (
    <TH>
      <button onClick={() => setSortKey(key)} className={`hover:text-erp-text1 transition-colors ${sortKey === key ? "text-erp-blue" : ""}`}>
        {label} {sortKey === key && "↓"}
      </button>
    </TH>
  );

  return (
    <div>
      {/* Stage filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {stages.map(s => (
          <FilterButton key={s.id} active={stageFilter.includes(s.id)} onClick={() => toggleStageFilter(s.id)}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color ?? "#6b7280" }} />
            {s.name}
          </FilterButton>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-erp-border0">
        <table className="w-full">
          <thead>
            <tr>
              <TH>Titel</TH>
              <TH>Bedrijf</TH>
              <TH>Contact</TH>
              {sortHeader("value", "Waarde")}
              {sortHeader("stage", "Fase")}
              <TH>Kans</TH>
              {sortHeader("expected_close", "Verwacht")}
              <TH>Toegewezen</TH>
              <TH>Dagen</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const daysInStage = differenceInDays(new Date(), new Date(d.updated_at));
              const stageColor = d.pipeline_stages?.color ?? "#6b7280";
              const isOverdue = d.expected_close && isPast(new Date(d.expected_close));
              const contactName = d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name ?? ""}`.trim() : "—";
              const assignedName = d.profiles?.full_name ?? d.profiles?.email ?? null;

              return (
                <TR key={d.id} onClick={() => onDealClick(d)}>
                  <TD className="font-semibold text-erp-text0 max-w-[200px] truncate">{d.title}</TD>
                  <TD className="text-erp-text1">{d.companies?.name ?? "—"}</TD>
                  <TD className="text-erp-text1">{contactName}</TD>
                  <TD className="text-right font-medium text-erp-text0">{eur(d.value ? Number(d.value) : 0)}</TD>
                  <TD><Badge color={stageColor}>{d.pipeline_stages?.name ?? "—"}</Badge></TD>
                  <TD className="text-erp-text2">{d.probability ?? "—"}%</TD>
                  <TD className={isOverdue ? "text-erp-red font-medium" : "text-erp-text2"}>
                    {d.expected_close ? format(new Date(d.expected_close), "d MMM", { locale: nl }) : "—"}
                  </TD>
                  <TD>
                    {assignedName ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={assignedName} id={d.assigned_to?.charCodeAt(0) ?? 0} size={20} />
                        <span className="text-erp-text1 text-xs truncate max-w-[80px]">{assignedName}</span>
                      </div>
                    ) : "—"}
                  </TD>
                  <TD>
                    <span className={`text-xs font-medium ${daysInStage > 14 ? "text-erp-orange" : "text-erp-text3"}`}>
                      {daysInStage}d
                    </span>
                  </TD>
                </TR>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-erp-text3 text-sm">Geen deals gevonden</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
