import { useState } from "react";
import { PageHeader, ErpButton, ErpCard, FilterButton, Avatar, Badge, Dot, Chip, TH, TD, TR } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { contacts, stageColors, stageLabels, tierColors } from "@/data/mockData";

export default function ContactsPage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const list = contacts.filter(c =>
    (filter === "all" || c.tier === filter) &&
    (q === "" || `${c.fn} ${c.ln} ${c.co}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Contacten" desc={`${contacts.length} contacten · ${contacts.filter(c => c.tier === "hot").length} hot leads`}>
        <ErpButton><Icons.Folder className="w-4 h-4" /> Import</ErpButton>
        <ErpButton primary><Icons.Plus className="w-4 h-4" /> Nieuw contact</ErpButton>
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

      <ErpCard className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr><TH>Contact</TH><TH>Bedrijf</TH><TH>Score</TH><TH>Status</TH><TH>Bron</TH><TH>Activiteit</TH></tr>
          </thead>
          <tbody>
            {list.map(c => (
              <TR key={c.id}>
                <TD>
                  <div className="flex items-center gap-[10px]">
                    <Avatar name={`${c.fn} ${c.ln}`} id={c.id} />
                    <div>
                      <div className="font-medium text-erp-text0">{c.fn} {c.ln}</div>
                      <div className="text-[11px] text-erp-text3">{c.email}</div>
                    </div>
                  </div>
                </TD>
                <TD>
                  <div className="text-erp-text0">{c.co}</div>
                  <div className="text-[11px] text-erp-text3">{c.ind} · {c.city}</div>
                </TD>
                <TD><Badge color={tierColors[c.tier]}><Dot color={tierColors[c.tier]} /> {c.score}</Badge></TD>
                <TD><Badge color={stageColors[c.stage]}><Dot color={stageColors[c.stage]} size={5} />{stageLabels[c.stage] || c.stage}</Badge></TD>
                <TD><Chip>{c.src}</Chip></TD>
                <TD className="text-erp-text2 text-xs">{c.last}</TD>
              </TR>
            ))}
          </tbody>
        </table>
      </ErpCard>
    </div>
  );
}
