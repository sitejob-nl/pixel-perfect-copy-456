import { useState, useMemo } from "react";
import { TH, TD, TR } from "@/components/erp/ErpPrimitives";
import ProspectStatusBadge from "./ProspectStatusBadge";
import ProspectDetailSheet from "./ProspectDetailSheet";
import ProspectConvertDialog from "./ProspectConvertDialog";
import type { KanbanData, ProspectLead, KanbanStage } from "@/hooks/useProspectKanban";
import { cn } from "@/lib/utils";
import { Eye, ChevronUp, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/erp/ErpIcons";

interface Props {
  data: KanbanData;
  statusFilter: string[];
  onStatusFilterChange: (v: string[]) => void;
}

type SortKey = "score" | "company_name" | "status" | "last_contacted_at" | "created_at";
type SortDir = "asc" | "desc";

export default function ProspectTable({ data, statusFilter, onStatusFilterChange }: Props) {
  const { stages, leads } = data;
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailLead, setDetailLead] = useState<ProspectLead | null>(null);
  const [convertLead, setConvertLead] = useState<ProspectLead | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = leads;
    if (statusFilter.length > 0) {
      list = list.filter(l => statusFilter.includes(l.status));
    }
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "score": av = a.score ?? 0; bv = b.score ?? 0; break;
        case "company_name": av = a.company_name.toLowerCase(); bv = b.company_name.toLowerCase(); break;
        case "status":
          av = stages.findIndex(s => s.status_key === a.status);
          bv = stages.findIndex(s => s.status_key === b.status);
          break;
        case "last_contacted_at": av = a.last_contacted_at || ""; bv = b.last_contacted_at || ""; break;
        case "created_at": av = a.created_at; bv = b.created_at; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, statusFilter, sortKey, sortDir, stages]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => toggleSort(k)}
      className="text-left px-4 py-[11px] text-[10.5px] font-semibold uppercase tracking-wider text-erp-text3 border-b border-erp-border0 bg-erp-bg3 cursor-pointer hover:text-erp-text1 select-none"
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );

  return (
    <>
      <div className="overflow-x-auto bg-erp-bg2 border border-erp-border0 rounded-xl">
        <table className="w-full">
          <thead>
            <tr>
              <SortHeader label="Bedrijf" k="company_name" />
              <TH>Stad</TH>
              <SortHeader label="Score" k="score" />
              <SortHeader label="Status" k="status" />
              <TH>Contact</TH>
              <TH>Demo</TH>
              <SortHeader label="Laatst contact" k="last_contacted_at" />
              <TH>Acties</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lead => (
              <TR key={lead.id} onClick={() => setDetailLead(lead)}>
                <TD className="font-medium text-erp-text0">{lead.company_name}</TD>
                <TD className="text-erp-text2">{lead.city || "—"}</TD>
                <TD>
                  {lead.score != null && lead.score > 0 ? (
                    <span className={cn(
                      "text-[12px] font-bold",
                      lead.score >= 61 ? "text-green-500" : lead.score >= 41 ? "text-yellow-500" : "text-red-500"
                    )}>{lead.score}</span>
                  ) : "—"}
                </TD>
                <TD><ProspectStatusBadge status={lead.status} stages={stages} /></TD>
                <TD className="text-erp-text2">{lead.contact_name || "—"}</TD>
                <TD>
                  {lead.demo_url ? (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Eye className="w-3 h-3 text-erp-blue" />
                      {lead.demo_view_count || 0}
                    </span>
                  ) : <span className="text-erp-text3">—</span>}
                </TD>
                <TD className="text-erp-text3 text-[12px]">
                  {lead.last_contacted_at
                    ? new Date(lead.last_contacted_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
                    : "—"
                  }
                </TD>
                <TD>
                  <DropdownMenu>
                    <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="text-erp-text3 hover:text-erp-text1">
                      <Icons.More className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-erp-bg2 border-erp-border0">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setDetailLead(lead); }} className="text-erp-text0 text-[12px]">
                        Details openen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setConvertLead(lead); }} className="text-green-500 text-[12px]">
                        Converteren
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[13px] text-erp-text3">
                  Geen prospects gevonden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProspectDetailSheet
        lead={detailLead}
        stages={stages}
        open={!!detailLead}
        onClose={() => setDetailLead(null)}
        onConvert={l => { setDetailLead(null); setConvertLead(l); }}
        onReject={() => {}}
      />
      <ProspectConvertDialog lead={convertLead} open={!!convertLead} onClose={() => setConvertLead(null)} />
    </>
  );
}
