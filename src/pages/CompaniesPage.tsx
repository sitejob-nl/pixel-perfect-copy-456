import { useState } from "react";
import { PageHeader, ErpButton, ErpCard, FilterButton, Avatar, Badge, Dot, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useCompanies, useDeleteCompany } from "@/hooks/useCompanies";
import CreateCompanyDialog from "@/components/erp/CreateCompanyDialog";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function CompaniesPage() {
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: companies = [], isLoading, error } = useCompanies();
  const deleteCompany = useDeleteCompany();
  const { toast } = useToast();

  const list = companies.filter(c =>
    q === "" || `${c.name} ${c.industry ?? ""} ${c.city ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

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
      <PageHeader title="Bedrijven" desc={`${companies.length} bedrijven`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuw bedrijf
        </ErpButton>
      </PageHeader>

      <div className="flex gap-2 mb-4 items-center">
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

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Bedrijven laden...</ErpCard>}
      {error && <ErpCard className="p-8 text-center text-erp-red text-sm">Fout bij laden: {(error as Error).message}</ErpCard>}

      {!isLoading && !error && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>Bedrijf</TH><TH>Branche</TH><TH>Locatie</TH><TH>Contact</TH><TH>Website</TH><TH>KVK</TH><TH>{""}</TH></tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen bedrijven gevonden</td></tr>
              )}
              {list.map(c => (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-[10px]">
                      <Avatar name={c.name} id={c.id.charCodeAt(0)} />
                      <div>
                        <div className="font-medium text-erp-text0">{c.name}</div>
                        {c.email && <div className="text-[11px] text-erp-text3">{c.email}</div>}
                      </div>
                    </div>
                  </TD>
                  <TD><span className="text-erp-text1">{c.industry ?? "—"}</span></TD>
                  <TD>
                    <span className="text-erp-text1">
                      {[c.city, c.postal_code].filter(Boolean).join(", ") || "—"}
                    </span>
                  </TD>
                  <TD><span className="text-erp-text1">{c.phone ?? "—"}</span></TD>
                  <TD>
                    {c.website ? (
                      <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener" className="text-erp-blue text-xs hover:underline">
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : <span className="text-erp-text3">—</span>}
                  </TD>
                  <TD><span className="text-erp-text2 text-xs">{c.kvk_number ?? "—"}</span></TD>
                  <TD>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-erp-text3 hover:text-erp-red transition-colors bg-transparent border-none cursor-pointer p-1"
                    >
                      ✕
                    </button>
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
