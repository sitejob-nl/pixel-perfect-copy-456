import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ErpButton, ErpCard, Avatar, Badge, Dot, Chip, TH, TD, TR } from "@/components/erp/ErpPrimitives";
import { useContacts } from "@/hooks/useContacts";
import CreateContactDialog from "@/components/erp/CreateContactDialog";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Plus, Search } from "lucide-react";
import { stageColors, stageLabels, tierColors } from "@/data/mockData";

export default function ContactsPage() {
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();

  const list = useMemo(() => {
    if (!q) return contacts;
    const lower = q.toLowerCase();
    return contacts.filter(c =>
      `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""} ${c.companies?.name ?? ""}`.toLowerCase().includes(lower)
    );
  }, [contacts, q]);

  const paged = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(list.length / PAGE_SIZE);

  const formatActivity = (date: string | null) => {
    if (!date) return "—";
    try { return formatDistanceToNow(new Date(date), { addSuffix: true, locale: nl }); } catch { return "—"; }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Contacten" desc={`${contacts.length} contacten`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Nieuw contact
        </ErpButton>
      </PageHeader>

      <div className="flex gap-2 mb-4 items-center">
        <div className="flex items-center gap-2 bg-erp-bg3 rounded-lg px-3 py-1.5 border border-erp-border0 w-[280px]">
          <Search className="w-4 h-4 text-erp-text3" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Zoek op naam, email, bedrijf..." className="bg-transparent border-none outline-none text-erp-text0 text-xs w-full" />
        </div>
      </div>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>}

      {!isLoading && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Naam</TH>
                <TH>Bedrijf</TH>
                <TH>Functie</TH>
                <TH>Email</TH>
                <TH>Telefoon</TH>
                <TH>Status</TH>
                <TH>Score</TH>
                <TH>Laatste contact</TH>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-erp-text3 text-sm border-b border-erp-border0">Geen contacten gevonden</td></tr>
              )}
              {paged.map(c => {
                const stage = c.lifecycle_stage ?? "lead";
                const tier = c.temperature ?? "warm";
                return (
                  <TR key={c.id} onClick={() => navigate(`/contacts/${c.id}`)}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${c.first_name} ${c.last_name ?? ""}`} id={c.id.charCodeAt(0)} />
                        <span className="font-medium text-erp-text0">{c.first_name} {c.last_name}</span>
                      </div>
                    </TD>
                    <TD>
                      {c.companies?.name ? (
                        <button onClick={e => { e.stopPropagation(); navigate(`/companies/${c.company_id}`); }} className="text-erp-blue hover:underline text-xs">
                          {c.companies.name}
                        </button>
                      ) : <span className="text-erp-text3">—</span>}
                    </TD>
                    <TD className="text-erp-text1 text-xs">{c.job_title ?? "—"}</TD>
                    <TD>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-erp-blue hover:underline text-xs">{c.email}</a>
                      ) : <span className="text-erp-text3">—</span>}
                    </TD>
                    <TD>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-erp-blue hover:underline text-xs">{c.phone}</a>
                      ) : <span className="text-erp-text3">—</span>}
                    </TD>
                    <TD>
                      <Badge color={stageColors[stage] ?? "#6b7280"}>
                        <Dot color={stageColors[stage] ?? "#6b7280"} size={5} />
                        {stageLabels[stage] ?? stage}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge color={tierColors[tier] ?? "#6b7280"}>
                        {c.lead_score ?? 0}
                      </Badge>
                    </TD>
                    <TD className="text-erp-text2 text-xs">{formatActivity(c.last_contacted_at)}</TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-erp-text3">Pagina {page + 1} van {totalPages}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg bg-erp-bg3 border border-erp-border0 text-xs text-erp-text1 disabled:opacity-40 hover:bg-erp-hover transition-colors">Vorige</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg bg-erp-bg3 border border-erp-border0 text-xs text-erp-text1 disabled:opacity-40 hover:bg-erp-hover transition-colors">Volgende</button>
          </div>
        </div>
      )}

      <CreateContactDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
