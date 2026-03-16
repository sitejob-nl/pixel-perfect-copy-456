import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, MoreHorizontal, Pencil, Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProjectPlans, useDeleteProjectPlan } from "@/hooks/useProjectPlans";
import PlanWizard from "@/components/project-plans/PlanWizard";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Concept", variant: "secondary" },
  review: { label: "Review", variant: "outline" },
  sent: { label: "Verstuurd", variant: "default" },
  accepted: { label: "Geaccepteerd", variant: "default" },
  declined: { label: "Afgewezen", variant: "destructive" },
  expired: { label: "Verlopen", variant: "secondary" },
};

const statusColors: Record<string, string> = {
  draft: "bg-erp-bg4 text-erp-text2",
  review: "bg-blue-500/20 text-blue-400",
  sent: "bg-amber-500/20 text-amber-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
  expired: "bg-erp-bg4 text-erp-text3",
};

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default function ProjectPlansPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: plans = [], isLoading } = useProjectPlans();
  const deleteMut = useDeleteProjectPlan();
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-erp-blue" />
          <h1 className="text-xl font-bold text-erp-text0">Projectplannen</h1>
        </div>
        <Button onClick={() => setWizardOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nieuw projectplan
        </Button>
      </div>

      <div className="border border-erp-border0 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-erp-border0 hover:bg-transparent">
              <TableHead className="text-erp-text3">Titel</TableHead>
              <TableHead className="text-erp-text3">Klant</TableHead>
              <TableHead className="text-erp-text3">Status</TableHead>
              <TableHead className="text-erp-text3 text-right">Bedrag</TableHead>
              <TableHead className="text-erp-text3">Aangemaakt</TableHead>
              <TableHead className="text-erp-text3">Verstuurd</TableHead>
              <TableHead className="text-erp-text3 text-right">Bekeken</TableHead>
              <TableHead className="text-erp-text3 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-erp-text3 py-8">Laden...</TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-erp-text3 py-8">Nog geen projectplannen</TableCell></TableRow>
            ) : plans.map(plan => (
              <TableRow key={plan.id} className="border-erp-border0 hover:bg-erp-hover cursor-pointer" onClick={() => navigate(`/project-plans/${plan.id}`)}>
                <TableCell className="font-medium text-erp-text0">{plan.title}</TableCell>
                <TableCell className="text-erp-text1">{plan.client_company || plan.companies?.name || "—"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[plan.status] || statusColors.draft}`}>
                    {statusMap[plan.status]?.label || plan.status}
                  </span>
                </TableCell>
                <TableCell className="text-right text-erp-text1">{plan.total_amount ? eur.format(plan.total_amount) : "—"}</TableCell>
                <TableCell className="text-erp-text2 text-sm">{format(new Date(plan.created_at), "d MMM yyyy", { locale: nl })}</TableCell>
                <TableCell className="text-erp-text2 text-sm">{plan.sent_at ? format(new Date(plan.sent_at), "d MMM yyyy", { locale: nl }) : "—"}</TableCell>
                <TableCell className="text-right text-erp-text2">{plan.view_count ?? 0}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-erp-bg3 border-erp-border0">
                      <DropdownMenuItem onClick={() => navigate(`/project-plans/${plan.id}`)} className="text-erp-text1 focus:bg-erp-hover">
                        <Pencil className="w-4 h-4 mr-2" /> Bewerken
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-erp-text1 focus:bg-erp-hover">
                        <Copy className="w-4 h-4 mr-2" /> Dupliceren
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 focus:bg-erp-hover"
                        onClick={() => {
                          if (confirm("Weet je zeker dat je dit plan wilt verwijderen?")) {
                            deleteMut.mutate(plan.id, { onSuccess: () => toast({ title: "Plan verwijderd" }) });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PlanWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
