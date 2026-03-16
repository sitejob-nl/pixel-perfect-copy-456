import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ErpButton, ErpCard, Avatar, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { useCompanies } from "@/hooks/useCompanies";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CreateCompanyDialog from "@/components/erp/CreateCompanyDialog";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Plus, Search, Star, Phone } from "lucide-react";

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const { data: companies = [], isLoading } = useCompanies();

  // Contact counts per company
  const { data: contactCounts = {} } = useQuery({
    queryKey: ["company-contact-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("company_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(c => { if (c.company_id) counts[c.company_id] = (counts[c.company_id] ?? 0) + 1; });
      return counts;
    },
  });

  const list = useMemo(() => {
    let result = companies;
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(c => `${c.name} ${c.city ?? ""} ${c.industry ?? ""}`.toLowerCase().includes(lower));
    }
    return result;
  }, [companies, q]);

  const paged = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(list.length / PAGE_SIZE);

  const formatActivity = (date: string | null) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      const days = Math.floor((Date.now() - d.getTime()) / 86400000);
      return { text: formatDistanceToNow(d, { addSuffix: true, locale: nl }), isOld: days > 30 };
    } catch { return null; }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Bedrijven" desc={`${list.length} bedrijven`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Nieuw bedrijf
        </ErpButton>
      </PageHeader>

      <div className="flex gap-2 mb-4 items-center">
        <div className="flex items-center gap-2 bg-erp-bg3 rounded-lg px-3 py-1.5 border border-erp-border0 w-[280px]">
          <Search className="w-4 h-4 text-erp-text3" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Zoek op naam, stad, branche..." className="bg-transparent border-none outline-none text-erp-text0 text-xs w-full" />
        </div>
      </div>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>}

      {!isLoading && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Naam</TH>
                <TH>Stad</TH>
                <TH>Branche</TH>
                <TH>Telefoon</TH>
                <TH>Google rating</TH>
                <TH>Contacten</TH>
                <TH>Laatste activiteit</TH>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-erp-text3 text-sm border-b border-erp-border0">Geen bedrijven gevonden</td></tr>
              )}
              {paged.map(c => {
                const act = formatActivity(c.last_activity_at);
                return (
                  <TR key={c.id} onClick={() => navigate(`/companies/${c.id}`)}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} id={c.id.charCodeAt(0)} />
                        <span className="font-medium text-erp-text0">{c.name}</span>
                      </div>
                    </TD>
                    <TD className="text-erp-text1">{c.city ?? "—"}</TD>
                    <TD className="text-erp-text1">{c.industry ?? "—"}</TD>
                    <TD>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-erp-blue hover:underline flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </a>
                      ) : <span className="text-erp-text3">—</span>}
                    </TD>
                    <TD>
                      {c.google_rating ? (
                        <span className="flex items-center gap-1 text-xs text-erp-text1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {c.google_rating}
                          {c.google_review_count && <span className="text-erp-text3">({c.google_review_count})</span>}
                        </span>
                      ) : <span className="text-erp-text3">—</span>}
                    </TD>
                    <TD className="text-erp-text1 text-xs">{contactCounts[c.id] ?? 0}</TD>
                    <TD>
                      {act ? (
                        <span className={`text-xs ${act.isOld ? "text-erp-red font-medium" : "text-erp-text2"}`}>{act.text}</span>
                      ) : <span className="text-erp-text3 text-xs">—</span>}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-erp-text3">Pagina {page + 1} van {totalPages}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg bg-erp-bg3 border border-erp-border0 text-xs text-erp-text1 disabled:opacity-40 hover:bg-erp-hover transition-colors">Vorige</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg bg-erp-bg3 border border-erp-border0 text-xs text-erp-text1 disabled:opacity-40 hover:bg-erp-hover transition-colors">Volgende</button>
          </div>
        </div>
      )}

      <CreateCompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
