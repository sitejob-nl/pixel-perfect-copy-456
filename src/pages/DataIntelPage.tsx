import { useState, useEffect } from "react";
import { PageHeader, ErpButton, ErpCard, StatCard, ErpTabs, Dot, Badge, Chip, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { tierColors } from "@/data/mockData";
import { useScrapeRuns, useScoringRules, useOutreachSequences, useDeleteScoringRule } from "@/hooks/useDataIntel";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import RunScraperDialog from "@/components/erp/RunScraperDialog";

export default function DataIntelPage() {
  const [tab, setTab] = useState("runs");
  const [showRunDialog, setShowRunDialog] = useState(false);

  const { data: org } = useOrganization();
  const { data: scrapeRuns = [] } = useScrapeRuns();
  const { data: scoringRules = [] } = useScoringRules();
  const { data: sequences = [] } = useOutreachSequences();
  const deleteScoringRule = useDeleteScoringRule();
  const queryClient = useQueryClient();

  // Auto-refresh scrape runs when any are still running
  const hasRunning = scrapeRuns.some(r => r.status === "running");
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["scrape-runs"] });
    }, 5000);
    return () => clearInterval(interval);
  }, [hasRunning, queryClient]);

  // Stats from scrape runs
  const totalLeads = scrapeRuns.reduce((a, r) => a + (r.raw_results_count ?? 0), 0);
  const totalImported = scrapeRuns.reduce((a, r) => a + (r.new_contacts_count ?? 0), 0);
  const totalHot = scrapeRuns.reduce((a, r) => a + (r.high_score_count ?? 0), 0);
  const totalCost = scrapeRuns.reduce((a, r) => a + Number(r.cost_euros ?? 0), 0);
  const importRatio = totalLeads > 0 ? Math.round((totalImported / totalLeads) * 100) : 0;

  const runStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "hsl(160,67%,52%)";
      case "running": return "hsl(225,93%,64%)";
      case "failed": return "hsl(0,93%,68%)";
      default: return "#6b7280";
    }
  };

  const formatTime = (date: string | null) => {
    if (!date) return "\u2014";
    try { return formatDistanceToNow(new Date(date), { addSuffix: true, locale: nl }); } catch { return "\u2014"; }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Data Intelligence" desc="Scraping, scoring & outreach pipeline">
        <ErpButton primary onClick={() => setShowRunDialog(true)}>
          <Icons.Zap className="w-4 h-4" /> Nieuwe run
        </ErpButton>
      </PageHeader>

      {org?.organization_id && (
        <RunScraperDialog
          open={showRunDialog}
          onOpenChange={setShowRunDialog}
          organizationId={org.organization_id}
        />
      )}

      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard label="Leads gevonden" value={String(totalLeads)} change={`${scrapeRuns.length} runs`} up />
        <StatCard label="Hot leads" value={String(totalHot)} change="hoge score" up />
        <StatCard label="Import ratio" value={`${importRatio}%`} change={`${totalImported} ge\u00efmporteerd`} up />
        <StatCard label="Kosten" value={totalCost.toFixed(2)} prefix="\u20ac" change={totalLeads > 0 ? `\u20ac${(totalCost / totalLeads).toFixed(3)} per lead` : "\u2014"} up />
      </div>

      <ErpTabs items={[["runs", "Scrape Runs"], ["scoring", "Scoring Rules"], ["outreach", "Outreach"]]} active={tab} onChange={setTab} />

      {tab === "runs" && (
        <div className="flex flex-col gap-[6px]">
          {scrapeRuns.length === 0 && (
            <ErpCard className="p-8 text-center text-erp-text3 text-sm">
              Nog geen scrape runs. Klik op <strong>"Nieuwe run"</strong> om te starten.
            </ErpCard>
          )}
          {scrapeRuns.map(r => (
            <ErpCard key={r.id} className="px-5 py-[14px] flex items-center gap-4" hover>
              <Dot color={runStatusColor(r.status)} size={8} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-erp-text0 mb-[3px]">{r.data_sources?.name ?? "Onbekende bron"}</div>
                <div className="flex gap-[10px] items-center">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-[2px] rounded uppercase ${
                    r.data_sources?.provider === "apify" ? "text-erp-green bg-erp-green/10" : "text-erp-amber bg-erp-amber/10"
                  }`}>{r.data_sources?.provider ?? "?"}</span>
                  <span className="text-xs text-erp-text3">{formatTime(r.created_at)}</span>
                </div>
              </div>
              {r.status !== "pending" && (
                <div className="flex gap-6">
                  <div className="text-center"><div className="text-[17px] font-bold">{r.raw_results_count ?? 0}</div><div className="text-[10px] text-erp-text3">Resultaten</div></div>
                  <div className="text-center"><div className="text-[17px] font-bold text-erp-blue">{r.new_contacts_count ?? 0}</div><div className="text-[10px] text-erp-text3">Import</div></div>
                  <div className="text-center"><div className="text-[17px] font-bold text-erp-red">{r.high_score_count ?? 0}</div><div className="text-[10px] text-erp-text3">Hot</div></div>
                </div>
              )}
              <div className="text-center min-w-[50px]">
                <div className="text-[13px] font-semibold text-erp-text2">\u20ac{Number(r.cost_euros ?? 0).toFixed(2)}</div>
                <div className="text-[10px] text-erp-text3">Kosten</div>
              </div>
              {r.status === "running" && (
                <div className="w-[18px] h-[18px] border-2 border-erp-blue border-t-transparent rounded-full animate-spin" />
              )}
            </ErpCard>
          ))}
        </div>
      )}

      {tab === "scoring" && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead><tr><TH>Regel</TH><TH>Veld</TH><TH>Operator</TH><TH>Waarde</TH><TH>Punten</TH><TH>Categorie</TH><TH></TH></tr></thead>
            <tbody>
              {scoringRules.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen scoring regels gevonden</td></tr>
              )}
              {scoringRules.map(r => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD><code className="text-[11px] text-erp-blue bg-erp-blue/10 px-[7px] py-[2px] rounded">{r.field_path}</code></TD>
                  <TD><Chip>{r.operator}</Chip></TD>
                  <TD className="text-erp-text2">{r.value ?? "\u2014"}</TD>
                  <TD><span className={`font-bold ${r.score_delta >= 0 ? "text-erp-green" : "text-erp-red"}`}>{r.score_delta >= 0 ? "+" : ""}{r.score_delta}</span></TD>
                  <TD><Chip>{r.category ?? "general"}</Chip></TD>
                  <TD>
                    <button
                      onClick={() => { if (confirm("Regel verwijderen?")) deleteScoringRule.mutate(r.id, { onSuccess: () => toast.success("Verwijderd") }); }}
                      className="text-erp-text3 hover:text-erp-red transition-colors p-1"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" />
                    </button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}

      {tab === "outreach" && (
        <div className="grid grid-cols-3 gap-[14px]">
          {sequences.length === 0 && (
            <ErpCard className="col-span-3 p-8 text-center text-erp-text3 text-sm">Geen outreach sequences gevonden.</ErpCard>
          )}
          {sequences.map(seq => {
            const tier = seq.target_tier ?? "all";
            const steps = Array.isArray(seq.steps) ? seq.steps.length : 0;
            return (
              <ErpCard key={seq.id} className="p-[18px]" hover>
                <div className="flex justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-erp-text0 mb-1">{seq.name}</div>
                    <div className="flex gap-[6px]">
                      <Badge color={tierColors[tier] ?? "#6b7280"}>{tier}</Badge>
                      <Chip>{steps} stappen</Chip>
                    </div>
                  </div>
                  <Dot color={seq.is_active ? "hsl(160,67%,52%)" : "#6b7280"} size={8} />
                </div>
                <div className="flex gap-4 mt-[6px]">
                  {([["Enrolled", seq.total_enrolled ?? 0, "text-erp-text0"], ["Replied", seq.total_replied ?? 0, "text-erp-blue"], ["Converted", seq.total_converted ?? 0, "text-erp-green"]] as const).map(([l, v, c]) => (
                    <div key={l}><div className={`text-lg font-bold ${c}`}>{v}</div><div className="text-[10px] text-erp-text3">{l}</div></div>
                  ))}
                </div>
              </ErpCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
