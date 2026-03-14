import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ErpButton, ErpCard, FilterButton, StatCard, Dot, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsMobile } from "@/hooks/use-mobile";
import CreateKlantDialog from "@/components/erp/CreateKlantDialog";

const EXCLUDED_KEYWORDS = ['Web', 'Agency', 'Media', 'Brendly', 'Rickid', 'Savvy', 'Yellow', 'Fluencer', 'Lefhebbers', 'Marsmedia'];
function isExcluded(name: string) {
  return EXCLUDED_KEYWORDS.some(kw => name.toLowerCase().includes(kw.toLowerCase()));
}

const healthColors: Record<string, string> = {
  green: "#22c55e", orange: "#f59e0b", red: "#ef4444", unknown: "#6b7280",
};

type HealthFilter = "all" | "green" | "orange" | "red" | "mrr";

export default function KlantenPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<HealthFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const isMobile = useIsMobile();

  const { data: klanten = [], isLoading } = useQuery({
    queryKey: ["klanten", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_klanten")
        .select("*")
        .eq("organization_id", orgId)
        .order("mrr", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const list = useMemo(() => {
    let result = showAll ? klanten : klanten.filter((k: any) => !isExcluded(k.name));

    if (q) {
      const lower = q.toLowerCase();
      result = result.filter((k: any) =>
        `${k.name} ${k.contact_naam ?? ""} ${k.city ?? ""} ${k.industry ?? ""}`.toLowerCase().includes(lower)
      );
    }

    if (filter === "green") result = result.filter((k: any) => k.gezondheid === "green");
    else if (filter === "orange") result = result.filter((k: any) => k.gezondheid === "orange");
    else if (filter === "red") result = result.filter((k: any) => k.gezondheid === "red");
    else if (filter === "mrr") result = result.filter((k: any) => (k.mrr ?? 0) > 0);

    return result;
  }, [klanten, q, filter, showAll]);

  const totalMrr = list.reduce((sum: number, k: any) => sum + (k.mrr ?? 0), 0);
  const redCount = klanten.filter((k: any) => k.gezondheid === "red" && !isExcluded(k.name)).length;

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Klanten" desc={`${list.length} klanten`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuwe klant
        </ErpButton>
      </PageHeader>

      <div className="grid grid-cols-3 gap-[14px] mb-6">
        <StatCard label="Totaal klanten" value={String(list.length)} change="in je CRM" up />
        <StatCard label="MRR" value={totalMrr >= 1000 ? `${(totalMrr / 1000).toFixed(1)}K` : String(totalMrr)} prefix="€" change="maandelijkse omzet" up />
        <StatCard label="Aandacht nodig" value={String(redCount)} change="kritieke klanten" up={false} />
      </div>

      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Alle</FilterButton>
        <FilterButton active={filter === "green"} onClick={() => setFilter("green")}><Dot color="#22c55e" /> Gezond</FilterButton>
        <FilterButton active={filter === "orange"} onClick={() => setFilter("orange")}><Dot color="#f59e0b" /> Aandacht</FilterButton>
        <FilterButton active={filter === "red"} onClick={() => setFilter("red")}><Dot color="#ef4444" /> Kritiek</FilterButton>
        <FilterButton active={filter === "mrr"} onClick={() => setFilter("mrr")}>Met MRR</FilterButton>
        <div className="flex-1" />
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] text-erp-text3 hover:text-erp-text1 transition-colors cursor-pointer bg-transparent border-none"
        >
          {showAll ? "Verberg scraped" : "Toon alle bedrijven"}
        </button>
        <div className="flex items-center gap-[7px] bg-erp-bg3 rounded-[7px] px-[10px] py-[6px] border border-erp-border0 w-[220px]">
          <Icons.Search className="w-[15px] h-[15px] text-erp-text3" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Zoeken..."
            className="bg-transparent border-none outline-none text-erp-text0 text-xs w-full"
          />
        </div>
      </div>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Klanten laden...</ErpCard>}

      {!isLoading && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Klant</TH>
                <TH>Status</TH>
                {!isMobile && <TH>Dagen</TH>}
                <TH>MRR</TH>
                {!isMobile && <TH>Projecten</TH>}
                {!isMobile && <TH>Contact</TH>}
                {!isMobile && <TH>Communicatie</TH>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen klanten gevonden</td></tr>
              )}
              {list.map((k: any) => (
                <TR key={k.id} onClick={() => navigate(`/klanten/${k.id}`)}>
                  <TD>
                    <div>
                      <div className="font-medium text-erp-blue text-[13px] hover:underline cursor-pointer">{k.name}</div>
                      {k.contact_naam && (
                        <div className="text-[11px] text-erp-text3">{k.contact_naam}{k.contact_functie ? ` · ${k.contact_functie}` : ""}</div>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <Dot color={healthColors[k.gezondheid] ?? healthColors.unknown} size={8} />
                  </TD>
                  {!isMobile && (
                    <TD><span className="text-erp-text2 text-xs">{k.dagen_stil != null ? `${k.dagen_stil}d` : "—"}</span></TD>
                  )}
                  <TD>
                    <span className="text-erp-text0 text-xs font-semibold">{k.mrr > 0 ? `€${fmt(Number(k.mrr))}` : "—"}</span>
                  </TD>
                  {!isMobile && (
                    <TD><span className="text-erp-text1 text-xs">{k.actieve_projecten ?? 0}</span></TD>
                  )}
                  {!isMobile && (
                    <TD>
                      <div className="text-[11px] text-erp-text3">
                        {k.contact_email && <div>{k.contact_email}</div>}
                        {k.contact_telefoon && <div>{k.contact_telefoon}</div>}
                        {!k.contact_email && !k.contact_telefoon && "—"}
                      </div>
                    </TD>
                  )}
                  {!isMobile && (
                    <TD>
                      <div className="flex gap-2 text-[11px] text-erp-text2">
                        {(k.emails_30d ?? 0) > 0 && <span>📧 {k.emails_30d}</span>}
                        {(k.calls_30d ?? 0) > 0 && <span>📞 {k.calls_30d}</span>}
                        {!(k.emails_30d > 0) && !(k.calls_30d > 0) && "—"}
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}

      <CreateKlantDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
