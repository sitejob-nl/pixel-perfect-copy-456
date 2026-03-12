import { useState } from "react";

import { useNavigate } from "react-router-dom";
import { PageHeader, ErpButton, ErpCard, FilterButton, Avatar, Badge, Dot, Chip, TH, TD, TR } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { stageColors, stageLabels, tierColors } from "@/data/mockData";
import { useContacts } from "@/hooks/useContacts";
import CreateContactDialog from "@/components/erp/CreateContactDialog";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function ContactsPage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: contacts = [], isLoading, error } = useContacts();

  const list = contacts.filter(c =>
    (filter === "all" || c.temperature === filter) &&
    (q === "" || `${c.first_name} ${c.last_name ?? ""} ${c.companies?.name ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  );

  const hotCount = contacts.filter(c => c.temperature === "hot").length;

  const formatActivity = (date: string | null) => {
    if (!date) return "—";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: nl });
    } catch {
      return "—";
    }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Contacten" desc={`${contacts.length} contacten · ${hotCount} hot leads`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuw contact
        </ErpButton>
      </PageHeader>

      <div className="flex gap-2 mb-4 items-center">
        {([["all", "Alles"], ["hot", "🔥 Hot"], ["warm", "🟡 Warm"], ["cold", "❄️ Cold"]] as const).map(([k, l]) => (
          <FilterButton key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</FilterButton>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-[7px] bg-erp-bg3 rounded-[7px] px-[10px] py-[6px] border border-erp-border0 w-[220px]">
          <Icons.Search className="w-[15px] h-[15px] text-erp-text3" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Zoeken..."
            className="bg-transparent border-none outline-none text-erp-text0 text-xs w-full"
          />
        </div>
      </div>

      {isLoading && (
        <ErpCard className="p-8 text-center text-erp-text2 text-sm">Contacten laden...</ErpCard>
      )}

      {error && (
        <ErpCard className="p-8 text-center text-erp-red text-sm">
          Fout bij laden: {(error as Error).message}
        </ErpCard>
      )}

      {!isLoading && !error && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>Contact</TH><TH>Bedrijf</TH><TH>Score</TH><TH>Status</TH><TH>Bron</TH><TH>Activiteit</TH></tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen contacten gevonden</td></tr>
              )}
              {list.map(c => {
                const tier = c.temperature ?? "warm";
                const stage = c.lifecycle_stage ?? "lead";
                return (
                  <TR key={c.id} onClick={() => navigate(`/contacts/${c.id}`)}>
                    <TD>
                      <div className="flex items-center gap-[10px]">
                        <Avatar name={`${c.first_name} ${c.last_name ?? ""}`} id={c.id.charCodeAt(0)} />
                        <div>
                          <div className="font-medium text-erp-text0">{c.first_name} {c.last_name}</div>
                          <div className="text-[11px] text-erp-text3">{c.email ?? "—"}</div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div className="text-erp-text0">{c.companies?.name ?? "—"}</div>
                      <div className="text-[11px] text-erp-text3">
                        {[c.companies?.industry, c.companies?.city].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </TD>
                    <TD>
                      <Badge color={tierColors[tier] ?? "#6b7280"}>
                        <Dot color={tierColors[tier] ?? "#6b7280"} /> {c.lead_score ?? 0}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge color={stageColors[stage] ?? "#6b7280"}>
                        <Dot color={stageColors[stage] ?? "#6b7280"} size={5} />
                        {stageLabels[stage] ?? stage}
                      </Badge>
                    </TD>
                    <TD><Chip>{c.source ?? "—"}</Chip></TD>
                    <TD className="text-erp-text2 text-xs">{formatActivity(c.last_activity_at)}</TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      <CreateContactDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
