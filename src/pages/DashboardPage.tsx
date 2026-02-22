import { StatCard, ErpCard, Dot, Chip, Badge, PageHeader, ErpButton, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { deals, pipelineStages } from "@/data/mockData";

export default function DashboardPage() {
  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Dashboard" desc="Goedemorgen, Kas. Hier is je overzicht voor vandaag.">
        <ErpButton><Icons.Calendar className="w-4 h-4" /> Deze maand <Icons.ChevDown className="w-3 h-3" /></ErpButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard label="Pipeline waarde" value="77.7K" prefix="€" change="+12% vs vorige maand" up />
        <StatCard label="Open deals" value="7" change="+3 deze week" up />
        <StatCard label="MRR" value="7.2K" prefix="€" change="+€400 groei" up />
        <StatCard label="Hot leads" value="13" change="+5 via Apify" up />
      </div>

      {/* Revenue + Pipeline */}
      <div className="grid grid-cols-[3fr_2fr] gap-[14px] mb-6">
        <ErpCard className="p-5">
          <div className="flex justify-between items-center mb-5">
            <span className="text-[15px] font-semibold">Omzet 2025</span>
            <div className="flex gap-[6px]">
              {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
                <span key={q} className={`text-[11px] px-[10px] py-[3px] rounded-md cursor-pointer font-medium ${
                  i === 0 ? "bg-erp-blue/10 text-erp-blue" : "bg-erp-bg3 text-erp-text3"
                }`}>{q}</span>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2 h-[130px] mb-4">
            {[{ m: "Jan", v: 4200 }, { m: "Feb", v: 8400 }, { m: "Mrt", v: 0 }].map((bar, i) => (
              <div key={bar.m} className="flex-1 flex flex-col items-center gap-[6px]">
                <span className={`text-[11px] font-semibold ${bar.v ? "text-erp-text0" : "text-erp-text3"}`}>
                  {bar.v ? `€${(bar.v / 1000).toFixed(1)}K` : ""}
                </span>
                <div className="w-full h-[120px] bg-erp-bg4 rounded-lg flex flex-col justify-end overflow-hidden">
                  {bar.v > 0 && (
                    <div
                      className="rounded-t-lg"
                      style={{
                        height: `${bar.v / 100}%`,
                        background: i === 1 ? "linear-gradient(180deg, hsl(225, 93%, 64%), hsl(263, 86%, 77%))" : "hsl(225, 93%, 64%)",
                        opacity: i === 2 ? 0.3 : 1,
                        minHeight: 4,
                      }}
                    />
                  )}
                </div>
                <span className="text-[11px] text-erp-text3">{bar.m}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-7 pt-3 border-t border-erp-border0">
            <div><div className="text-[11px] text-erp-text3">YTD Omzet</div><div className="text-lg font-bold mt-[2px]">€12.600</div></div>
            <div><div className="text-[11px] text-erp-text3">Openstaand</div><div className="text-lg font-bold mt-[2px] text-erp-amber">€20.250</div></div>
            <div><div className="text-[11px] text-erp-text3">MRR</div><div className="text-lg font-bold mt-[2px] text-erp-green">€7.200</div></div>
          </div>
        </ErpCard>

        <ErpCard className="p-5">
          <div className="text-[15px] font-semibold mb-4">Pipeline verdeling</div>
          {pipelineStages.filter(s => !("won" in s)).map(st => {
            const ds = deals.filter(d => d.stage === st.name);
            const total = ds.reduce((a, d) => a + d.val, 0);
            const pct = Math.round(total / 777 * 100);
            return (
              <div key={st.name} className="mb-[14px]">
                <div className="flex justify-between mb-[5px]">
                  <span className="text-xs text-erp-text1 flex items-center gap-[6px]">
                    <Dot color={st.color} /> {st.name} <span className="text-erp-text3">({ds.length})</span>
                  </span>
                  <span className="text-xs font-semibold">€{fmt(total)}</span>
                </div>
                <div className="h-[5px] bg-erp-bg4 rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, background: st.color }} />
                </div>
              </div>
            );
          })}
        </ErpCard>
      </div>

      {/* Activity + Tasks */}
      <div className="grid grid-cols-2 gap-[14px]">
        <ErpCard className="p-5">
          <div className="flex justify-between mb-[14px]">
            <span className="text-[15px] font-semibold">Recente activiteit</span>
            <span className="text-xs text-erp-blue cursor-pointer">Alles</span>
          </div>
          {[
            { icon: "📞", text: "Bel met Jan de Vries", t: "2u geleden", tag: "Call" },
            { icon: "📧", text: "Offerte TechFlow Solutions", t: "5u geleden", tag: "Offerte" },
            { icon: "⚡", text: "Apify: 187 resultaten, 8 hot", t: "06:00", tag: "Auto" },
            { icon: "✅", text: "Contract getekend AutoService", t: "Gisteren", tag: "Conversie" },
            { icon: "💬", text: "WhatsApp Peter Smeets", t: "Gisteren", tag: "Chat" },
          ].map((a, i) => (
            <div key={i} className={`flex items-center gap-3 py-[9px] ${i < 4 ? "border-b border-erp-border0" : ""}`}>
              <span className="text-base w-[26px] text-center">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-erp-text0 truncate">{a.text}</div>
                <div className="text-[11px] text-erp-text3 mt-[1px]">{a.t}</div>
              </div>
              <Chip>{a.tag}</Chip>
            </div>
          ))}
        </ErpCard>

        <ErpCard className="p-5">
          <div className="flex justify-between mb-[14px]">
            <span className="text-[15px] font-semibold">Taken vandaag</span>
            <span className="text-xs text-erp-blue cursor-pointer">Planning</span>
          </div>
          {[
            { time: "10:00", title: "Demo Mark Jansen", sub: "Bouwbedrijf Helmond", urg: false },
            { time: "13:30", title: "Follow-up TechFlow", sub: "Lisa Bakker", urg: true },
            { time: "15:00", title: "Review Interieurs Plus", sub: "Klantportaal", urg: false },
            { time: "Morgen", title: "Apify Horeca run", sub: "~200 resultaten", urg: false },
            { time: "Wo", title: "Contract Fitness First", sub: "Digitaal tekenen", urg: false },
          ].map((t, i) => (
            <div key={i} className={`flex items-start gap-3 py-[9px] ${i < 4 ? "border-b border-erp-border0" : ""}`}>
              <div className={`min-w-[44px] text-xs font-semibold pt-[1px] ${t.urg ? "text-erp-red" : "text-erp-text2"}`}>{t.time}</div>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-erp-text0">{t.title}</div>
                <div className="text-xs text-erp-text3 mt-[1px]">{t.sub}</div>
              </div>
              {t.urg && <Badge color="hsl(0, 93%, 68%)">URGENT</Badge>}
            </div>
          ))}
        </ErpCard>
      </div>
    </div>
  );
}
