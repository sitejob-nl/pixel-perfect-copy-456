import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ErpButton, ErpCard, FilterButton, Avatar, Badge, Dot, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useCompanies, useDeleteCompany } from "@/hooks/useCompanies";
import CreateCompanyDialog from "@/components/erp/CreateCompanyDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

const EXCLUDED_KEYWORDS = ['Web', 'Agency', 'Media', 'Brendly', 'Rickid', 'Savvy', 'Yellow', 'Fluencer', 'Lefhebbers', 'Marsmedia'];
function isExcluded(name: string) {
  const lower = name.toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

const healthColors: Record<string, string> = {
  green: "#22c55e", orange: "#f59e0b", red: "#ef4444", unknown: "#6b7280",
};

type HealthFilter = "all" | "green" | "orange" | "red" | "mrr";

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<HealthFilter>("all");
  const { data: companies = [], isLoading, error } = useCompanies();
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();
  const { data: org } = useOrganization();

  const { data: healthData = [] } = useQuery({
    queryKey: ["companies-health", org?.organization_id],
    enabled: !!org?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_company_health")
        .select("*")
        .order("days_since_activity", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const healthMap = useMemo(() => {
    const map = new Map<string, any>();
    healthData.forEach((h: any) => map.set(h.id, h));
    return map;
  }, [healthData]);

  const list = useMemo(() => {
    let result = companies
      .filter(c => !isExcluded(c.name))
      .map(c => ({ ...c, health: healthMap.get(c.id) }));

    if (q) {
      result = result.filter(c =>
        `${c.name} ${c.industry ?? ""} ${c.city ?? ""}`.toLowerCase().includes(q.toLowerCase())
      );
    }

    if (filter === "green") result = result.filter(c => c.health?.health_status === "green");
    else if (filter === "orange") result = result.filter(c => c.health?.health_status === "orange");
    else if (filter === "red") result = result.filter(c => c.health?.health_status === "red");
    else if (filter === "mrr") result = result.filter(c => c.health?.total_mrr > 0);

    result.sort((a, b) => (b.health?.days_since_activity ?? 9999) - (a.health?.days_since_activity ?? 9999));
    return result;
  }, [companies, q, filter, healthMap]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return;
    try {
      await deleteCompany.mutateAsync(id);
      toast({ title: "Bedrijf verwijderd" });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Bedrijven" desc={`${list.length} bedrijven`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuw bedrijf
        </ErpButton>
      </PageHeader>

      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Alle</FilterButton>
        <FilterButton active={filter === "green"} onClick={() => setFilter("green")}><Dot color="#22c55e" /> Gezond</FilterButton>
        <FilterButton active={filter === "orange"} onClick={() => setFilter("orange")}><Dot color="#f59e0b" /> Aandacht</FilterButton>
        <FilterButton active={filter === "red"} onClick={() => setFilter("red")}><Dot color="#ef4444" /> Kritiek</FilterButton>
        <FilterButton active={filter === "mrr"} onClick={() => setFilter("mrr")}>MRR &gt; 0</FilterButton>
        <div className="flex-1" />
        <div className="flex items-center gap-[7px] bg-erp-bg3 rounded-[7px] px-[10px] py-[6px] border border-erp-border0 w-[220px]">
          <Icons.Search className="w-[15px] h-[15px] text-erp-text3" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Zoeken..."
            className="bg-transparent border-none outline-none text-erp-text0 text-xs w-full"
          />
        </div>
      </div>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Bedrijven laden...</ErpCard>}
      {error && <ErpCard className="p-8 text-center text-erp-red text-sm">Fout bij laden: {(error as Error).message}</ErpCard>}

      {!isLoading && !error && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>Bedrijf</TH><TH>Gezondheid</TH><TH>Branche</TH><TH>Locatie</TH><TH>MRR</TH><TH>Projecten</TH><TH>Website</TH><TH>{""}</TH></tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen bedrijven gevonden</td></tr>
              )}
              {list.map(c => (
                <TR key={c.id} onClick={() => navigate(`/klanten/${c.id}`)}>
                  <TD>
                    <div className="flex items-center gap-[10px]">
                      <Avatar name={c.name} id={c.id.charCodeAt(0)} />
                      <div>
                        <div className="font-medium text-erp-text0">{c.name}</div>
                        {c.email && <div className="text-[11px] text-erp-text3">{c.email}</div>}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Dot color={healthColors[c.health?.health_status] ?? healthColors.unknown} size={8} />
                      <span className="text-erp-text2 text-xs">
                        {c.health?.days_since_activity != null ? `${c.health.days_since_activity}d` : "—"}
                      </span>
                    </div>
                  </TD>
                  <TD><span className="text-erp-text1">{c.industry ?? "—"}</span></TD>
                  <TD><span className="text-erp-text1">{[c.city, c.postal_code].filter(Boolean).join(", ") || "—"}</span></TD>
                  <TD><span className="text-erp-text0 text-xs font-medium">{c.health?.total_mrr > 0 ? `€${fmt(Number(c.health.total_mrr))}` : "—"}</span></TD>
                  <TD><span className="text-erp-text1 text-xs">{c.health?.active_projects ?? 0}</span></TD>
                  <TD>
                    {c.website ? (
                      <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener" className="text-erp-blue text-xs hover:underline">
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : <span className="text-erp-text3">—</span>}
                  </TD>
                  <TD>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-erp-text3 hover:text-erp-red transition-colors bg-transparent border-none cursor-pointer p-1"
                    >✕</button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}

      <CreateCompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
