import { useState } from "react";
import { PageHeader, ErpButton, ErpCard, Badge, Dot, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useQuotes, useUpdateQuote, useDeleteQuote } from "@/hooks/useQuotes";
import CreateQuoteDialog from "@/components/erp/CreateQuoteDialog";
import { toast } from "sonner";
import { format } from "date-fns";

const quoteStatus: Record<string, [string, string]> = {
  draft: ["Concept", "#6b7280"],
  sent: ["Verstuurd", "hsl(225, 93%, 64%)"],
  accepted: ["Geaccepteerd", "hsl(160, 67%, 52%)"],
  rejected: ["Afgewezen", "hsl(0, 93%, 68%)"],
  expired: ["Verlopen", "hsl(43, 96%, 56%)"],
};

export default function QuotesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: quotes = [], isLoading } = useQuotes();
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();

  const statusFlow: Record<string, string> = { draft: "sent", sent: "accepted" };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Offertes" desc={`${quotes.length} offertes · €${fmt(quotes.filter(q => q.status === "sent").reduce((a, q) => a + (q.total_amount ?? 0), 0))} uitstaand`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}><Icons.Plus className="w-4 h-4" /> Nieuwe offerte</ErpButton>
      </PageHeader>

      {isLoading ? (
        <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>
      ) : (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead><tr><TH>Offerte</TH><TH>Contact</TH><TH>Bedrag</TH><TH>Status</TH><TH>Datum</TH><TH></TH></tr></thead>
            <tbody>
              {quotes.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen offertes gevonden</td></tr>
              )}
              {quotes.map(q => {
                const [sl, sc] = quoteStatus[q.status] || ["?", "#6b7280"];
                const contactName = q.contacts ? `${q.contacts.first_name} ${q.contacts.last_name ?? ""}`.trim() : "—";
                const nextStatus = statusFlow[q.status];
                return (
                  <TR key={q.id}>
                    <TD className="font-semibold text-erp-text0 text-xs font-mono">{q.quote_number}</TD>
                    <TD className="text-erp-text1">{contactName}</TD>
                    <TD className="font-semibold">€{fmt(q.total_amount ?? 0)}</TD>
                    <TD><Badge color={sc}><Dot color={sc} size={5} />{sl}</Badge></TD>
                    <TD className="text-erp-text2 text-xs">
                      {q.created_at ? format(new Date(q.created_at), "d MMM yyyy") : "—"}
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        {nextStatus && (
                          <button
                            onClick={() => updateQuote.mutate(
                              { id: q.id, status: nextStatus },
                              { onSuccess: () => toast.success(`Status → ${quoteStatus[nextStatus]?.[0] ?? nextStatus}`) }
                            )}
                            className="text-[11px] text-erp-blue hover:underline"
                          >
                            → {quoteStatus[nextStatus]?.[0] ?? nextStatus}
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm("Offerte verwijderen?")) deleteQuote.mutate(q.id, { onSuccess: () => toast.success("Verwijderd") }); }}
                          className="text-erp-text3 hover:text-erp-red transition-colors p-1 ml-1"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      <CreateQuoteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
