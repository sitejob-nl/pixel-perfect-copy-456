import { PageHeader, ErpButton, ErpCard, StatCard, Badge, Dot, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { projects, invoices, projStatus, invStatus } from "@/data/mockData";

export function ProjectsPage() {
  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Projecten" desc={`${projects.length} projecten · ${projects.filter(p => p.status === "in_progress").length} actief`}>
        <ErpButton primary><Icons.Plus className="w-4 h-4" /> Nieuw project</ErpButton>
      </PageHeader>
      <ErpCard className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead><tr><TH>Project</TH><TH>Klant</TH><TH>Status</TH><TH>Waarde</TH><TH>Deadline</TH><TH>Voortgang</TH></tr></thead>
          <tbody>
            {projects.map(p => {
              const [sl, sc] = projStatus[p.status] || ["?", "#6b7280"];
              return (
                <TR key={p.id}>
                  <TD><div className="font-medium text-erp-text0">{p.name}</div><div className="text-[11px] text-erp-text3">{p.nr}</div></TD>
                  <TD className="text-erp-text1">{p.co}</TD>
                  <TD><Badge color={sc}><Dot color={sc} size={5} />{sl}</Badge></TD>
                  <TD className="font-semibold">€{fmt(p.val)}</TD>
                  <TD className="text-erp-text2 text-xs">{p.deadline}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 bg-erp-bg4 rounded-sm overflow-hidden">
                        <div className="h-full rounded-sm" style={{ width: `${p.pct}%`, background: p.pct === 100 ? "hsl(160, 67%, 52%)" : "hsl(225, 93%, 64%)" }} />
                      </div>
                      <span className="text-[11px] text-erp-text3">{p.pct}%</span>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </table>
      </ErpCard>
    </div>
  );
}

export function InvoicesPage() {
  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Facturen" desc={`${invoices.length} facturen · €${fmt(invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((a, i) => a + i.amt, 0))} openstaand`}>
        <ErpButton primary><Icons.Plus className="w-4 h-4" /> Nieuwe factuur</ErpButton>
      </PageHeader>
      <div className="grid grid-cols-3 gap-[14px] mb-5">
        <StatCard label="Betaald (YTD)" value="6.8K" prefix="€" change="+€3.4K deze maand" up />
        <StatCard label="Openstaand" value="20.3K" prefix="€" change="2 facturen" up={false} />
        <StatCard label="Te laat" value="6.3K" prefix="€" change="1 factuur > 14d" up={false} />
      </div>
      <ErpCard className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead><tr><TH>Factuur</TH><TH>Klant</TH><TH>Bedrag</TH><TH>Status</TH><TH>Datum</TH><TH>Vervaldatum</TH></tr></thead>
          <tbody>
            {invoices.map(inv => {
              const [sl, sc] = invStatus[inv.status] || ["?", "#6b7280"];
              return (
                <TR key={inv.id}>
                  <TD className="font-semibold text-erp-text0 text-xs font-mono">{inv.nr}</TD>
                  <TD className="text-erp-text1">{inv.co}</TD>
                  <TD className="font-semibold">€{fmt(inv.amt)}</TD>
                  <TD><Badge color={sc}><Dot color={sc} size={5} />{sl}</Badge></TD>
                  <TD className="text-erp-text2 text-xs">{inv.date}</TD>
                  <TD className={`text-xs ${inv.status === "overdue" ? "text-erp-red font-semibold" : "text-erp-text2"}`}>{inv.due}</TD>
                </TR>
              );
            })}
          </tbody>
        </table>
      </ErpCard>
    </div>
  );
}
