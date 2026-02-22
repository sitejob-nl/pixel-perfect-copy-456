import { useState } from "react";
import { PageHeader, ErpButton, ErpCard, StatCard, ErpTabs, Dot, Badge, Chip, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { scrapeRuns, tierColors } from "@/data/mockData";

export default function DataIntelPage() {
  const [tab, setTab] = useState("runs");

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Data Intelligence" desc="Apify + Firecrawl + MCP pipeline">
        <ErpButton><Icons.Settings className="w-4 h-4" /> Bronnen</ErpButton>
        <ErpButton primary><Icons.Zap className="w-4 h-4" /> Nieuwe run</ErpButton>
      </PageHeader>

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard label="Leads deze maand" value="281" change="+64 vs vorige maand" up />
        <StatCard label="Hot leads" value="13" change="+5 via audits" up />
        <StatCard label="Import ratio" value="23%" change="+4% verbetering" up />
        <StatCard label="Kosten" value="5.10" prefix="€" change="€0.08 per lead" up />
      </div>

      <ErpTabs items={[["runs", "Scrape Runs"], ["scoring", "Scoring Rules"], ["outreach", "Outreach"]]} active={tab} onChange={setTab} />

      {tab === "runs" && (
        <div className="flex flex-col gap-[6px]">
          {scrapeRuns.map(r => (
            <ErpCard key={r.id} className="px-5 py-[14px] flex items-center gap-4" hover>
              <Dot color={r.status === "completed" ? "hsl(160,67%,52%)" : r.status === "running" ? "hsl(225,93%,64%)" : "#6b7280"} size={8} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-erp-text0 mb-[3px]">{r.name}</div>
                <div className="flex gap-[10px] items-center">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-[2px] rounded uppercase ${
                    r.prov === "Apify" ? "text-erp-green bg-erp-green/10" : "text-erp-amber bg-erp-amber/10"
                  }`}>{r.prov}</span>
                  <span className="text-xs text-erp-text3">{r.t}</span>
                </div>
              </div>
              {r.status !== "scheduled" && (
                <div className="flex gap-6">
                  <div className="text-center"><div className="text-[17px] font-bold">{r.res}</div><div className="text-[10px] text-erp-text3">Resultaten</div></div>
                  <div className="text-center"><div className="text-[17px] font-bold text-erp-blue">{r.imp}</div><div className="text-[10px] text-erp-text3">Import</div></div>
                  <div className="text-center"><div className="text-[17px] font-bold text-erp-red">{r.hot}</div><div className="text-[10px] text-erp-text3">Hot</div></div>
                </div>
              )}
              <div className="text-center min-w-[50px]">
                <div className="text-[13px] font-semibold text-erp-text2">{r.cost}</div>
                <div className="text-[10px] text-erp-text3">Kosten</div>
              </div>
              {r.status === "running" && (
                <div className="w-[18px] h-[18px] border-2 border-erp-blue border-t-transparent rounded-full animate-spin-loader" />
              )}
            </ErpCard>
          ))}
        </div>
      )}

      {tab === "scoring" && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead><tr><TH>Regel</TH><TH>Veld</TH><TH>Operator</TH><TH>Waarde</TH><TH>Punten</TH><TH>Categorie</TH></tr></thead>
            <tbody>
              {[
                { n: "Geen CRM", f: "has_crm", o: "equals", v: "false", p: "+20", c: "Tech" },
                { n: "WordPress/Wix", f: "tech_stack", o: "contains", v: "WordPress", p: "+15", c: "Tech" },
                { n: "Bedrijf 10-100", f: "company_size", o: "in", v: "10-50, 50-100", p: "+15", c: "Company" },
                { n: "Regio Brabant", f: "city", o: "in", v: "Eindhoven, Tilburg...", p: "+10", c: "Location" },
                { n: "Geen ERP", f: "has_erp", o: "equals", v: "false", p: "+10", c: "Tech" },
                { n: "Geen website", f: "website", o: "not_exists", v: "—", p: "-15", c: "Tech" },
              ].map((r, i) => (
                <TR key={i}>
                  <TD className="font-medium">{r.n}</TD>
                  <TD><code className="text-[11px] text-erp-blue bg-erp-blue/10 px-[7px] py-[2px] rounded">{r.f}</code></TD>
                  <TD><Chip>{r.o}</Chip></TD>
                  <TD className="text-erp-text2">{r.v}</TD>
                  <TD><span className={`font-bold ${r.p[0] === "+" ? "text-erp-green" : "text-erp-red"}`}>{r.p}</span></TD>
                  <TD><Chip>{r.c}</Chip></TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}

      {tab === "outreach" && (
        <div className="grid grid-cols-3 gap-[14px]">
          {[
            { name: "Hot Lead Sequence", tier: "hot", steps: 4, enrolled: 23, replied: 8, converted: 3, active: true },
            { name: "Warm Nurture Flow", tier: "warm", steps: 6, enrolled: 67, replied: 12, converted: 2, active: true },
            { name: "Cold Re-engagement", tier: "cold", steps: 3, enrolled: 45, replied: 3, converted: 0, active: false },
          ].map((seq, i) => (
            <ErpCard key={i} className="p-[18px]" hover>
              <div className="flex justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-erp-text0 mb-1">{seq.name}</div>
                  <div className="flex gap-[6px]">
                    <Badge color={tierColors[seq.tier]}>{seq.tier}</Badge>
                    <Chip>{seq.steps} stappen</Chip>
                  </div>
                </div>
                <Dot color={seq.active ? "hsl(160,67%,52%)" : "#6b7280"} size={8} />
              </div>
              <div className="flex gap-4 mt-[6px]">
                {([["Enrolled", seq.enrolled, "text-erp-text0"], ["Replied", seq.replied, "text-erp-blue"], ["Converted", seq.converted, "text-erp-green"]] as const).map(([l, v, c]) => (
                  <div key={l}><div className={`text-lg font-bold ${c}`}>{v}</div><div className="text-[10px] text-erp-text3">{l}</div></div>
                ))}
              </div>
            </ErpCard>
          ))}
        </div>
      )}
    </div>
  );
}
