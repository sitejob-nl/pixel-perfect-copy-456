import { PageHeader, ErpButton, ErpCard, Badge, Dot, Chip, TH, TD, TR } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { contentItems } from "@/data/mockData";

const platformColors: Record<string, string> = {
  linkedin: "hsl(225,93%,64%)", blog: "hsl(160,67%,52%)",
  instagram: "hsl(263,86%,77%)", email: "hsl(43,96%,56%)",
};
const statusLabels: Record<string, string> = {
  idea: "Idee", draft: "Concept", review: "Review", scheduled: "Gepland", published: "Gepubliceerd",
};

export default function ContentPage() {
  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Content Calendar" desc="Plan en publiceer content">
        <ErpButton primary><Icons.Plus className="w-4 h-4" /> Nieuwe content</ErpButton>
      </PageHeader>
      <ErpCard className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead><tr><TH>Content</TH><TH>Platform</TH><TH>Status</TH><TH>Type</TH><TH>Datum</TH></tr></thead>
          <tbody>
            {contentItems.map(c => (
              <TR key={c.id}>
                <TD className="font-medium text-erp-text0">{c.title}</TD>
                <TD><Badge color={platformColors[c.plat] || "hsl(var(--erp-text-2))"}><Dot color={platformColors[c.plat] || "#6b7280"} size={5} />{c.plat}</Badge></TD>
                <TD><Chip>{statusLabels[c.status] || c.status}</Chip></TD>
                <TD className="text-erp-text2">{c.type}</TD>
                <TD className="text-erp-text2 text-xs">{c.date}</TD>
              </TR>
            ))}
          </tbody>
        </table>
      </ErpCard>
    </div>
  );
}
