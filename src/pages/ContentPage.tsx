import { useState } from "react";
import { PageHeader, ErpButton, ErpCard, Badge, Dot, Chip, TH, TD, TR } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { contentItems } from "@/data/mockData";
import LinkedInPostDialog from "@/components/content/LinkedInPostDialog";

const platformColors: Record<string, string> = {
  linkedin: "hsl(225,93%,64%)", blog: "hsl(160,67%,52%)",
  instagram: "hsl(263,86%,77%)", email: "hsl(43,96%,56%)",
};
const statusLabels: Record<string, string> = {
  idea: "Idee", draft: "Concept", review: "Review", scheduled: "Gepland", published: "Gepubliceerd",
};

export default function ContentPage() {
  const [linkedinOpen, setLinkedinOpen] = useState(false);

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Content Calendar" desc="Plan en publiceer content">
        <ErpButton onClick={() => setLinkedinOpen(true)} className="bg-[hsl(225,93%,64%)] hover:bg-[hsl(225,93%,54%)] text-white">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
          LinkedIn Post
        </ErpButton>
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
      <LinkedInPostDialog open={linkedinOpen} onOpenChange={setLinkedinOpen} />
    </div>
  );
}
