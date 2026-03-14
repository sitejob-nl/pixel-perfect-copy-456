import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, ErpButton, ErpCard, StatCard, Badge, Dot, TH, TD, TR, fmt, FilterButton, Chip } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { projStatus, invStatus } from "@/data/mockData";
import { useProjects, useDeleteProject, useUpdateProject } from "@/hooks/useProjects";
import { useInvoices, useUpdateInvoice, useDeleteInvoice } from "@/hooks/useInvoices";
import CreateProjectDialog from "@/components/erp/CreateProjectDialog";
import CreateInvoiceDialog from "@/components/erp/CreateInvoiceDialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusOptions = Object.entries(projStatus);
const priorityOptions = [
  { value: "low", label: "Laag" },
  { value: "medium", label: "Normaal" },
  { value: "high", label: "Hoog" },
  { value: "urgent", label: "Urgent" },
];

type ProjFilter = "all" | "active" | "delivered" | "dev" | "intern";

export function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<ProjFilter>("all");
  const { data: projects = [], isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const navigate = useNavigate();

  const activeCount = projects.filter(p => p.status === "in_progress").length;

  const list = useMemo(() => {
    let result = [...projects];
    switch (filter) {
      case "active": result = result.filter(p => p.status === "in_progress"); break;
      case "delivered": result = result.filter(p => p.status === "delivered"); break;
      case "dev": result = result.filter(p => ["intake", "quoted", "accepted"].includes(p.status)); break;
      case "intern": result = result.filter(p => p.service_type === "saas" || p.service_type === "intern"); break;
    }
    return result;
  }, [projects, filter]);

  const handleStatusChange = (projectId: string, newStatus: string) => {
    updateProject.mutate(
      { id: projectId, status: newStatus },
      { onSuccess: () => toast.success(`Status → ${projStatus[newStatus]?.[0] ?? newStatus}`) }
    );
  };

  const handlePriorityChange = (projectId: string, newPriority: string) => {
    updateProject.mutate(
      { id: projectId, priority: newPriority },
      { onSuccess: () => toast.success(`Prioriteit → ${priorityOptions.find(o => o.value === newPriority)?.label ?? newPriority}`) }
    );
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Projecten" desc={`${projects.length} projecten · ${activeCount} actief`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}><Icons.Plus className="w-4 h-4" /> Nieuw project</ErpButton>
      </PageHeader>

      <div className="flex gap-2 mb-4 flex-wrap">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Alle</FilterButton>
        <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>Actief</FilterButton>
        <FilterButton active={filter === "delivered"} onClick={() => setFilter("delivered")}>Opgeleverd</FilterButton>
        <FilterButton active={filter === "dev"} onClick={() => setFilter("dev")}>In development</FilterButton>
        <FilterButton active={filter === "intern"} onClick={() => setFilter("intern")}>Intern</FilterButton>
      </div>

      {isLoading ? (
        <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>
      ) : (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead><tr><TH>Project</TH><TH>Klant</TH><TH>Status</TH><TH>Waarde</TH><TH>MRR</TH><TH>Laatste activiteit</TH><TH>Info</TH><TH></TH></tr></thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen projecten gevonden</td></tr>
              )}
              {list.map(p => {
                const [sl, sc] = projStatus[p.status] || ["?", "#6b7280"];
                const contactName = p.contacts ? `${p.contacts.first_name} ${p.contacts.last_name ?? ""}`.trim() : null;
                return (
                  <TR key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                    <TD>
                      <div className="font-medium text-erp-blue hover:underline cursor-pointer">{p.name}</div>
                      <div className="text-[11px] text-erp-text3">{p.project_number}</div>
                    </TD>
                    <TD>
                      <div className="text-erp-text1">{p.companies?.name ?? "—"}</div>
                      {contactName && <div className="text-[11px] text-erp-text3">{contactName}</div>}
                    </TD>
                    <TD><Badge color={sc}><Dot color={sc} size={5} />{sl}</Badge></TD>
                    <TD className="font-semibold">{p.estimated_value ? `€${fmt(p.estimated_value)}` : "—"}</TD>
                    <TD className="text-erp-text0 text-xs font-medium">
                      {(p as any).monthly_amount ? `€${fmt((p as any).monthly_amount)}` : "—"}
                    </TD>
                    <TD className="text-erp-text2 text-xs">
                      {(p as any).last_activity_at
                        ? formatDistanceToNow(new Date((p as any).last_activity_at), { addSuffix: true, locale: nl })
                        : "—"}
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        {(p as any).billing_frequency && <Chip>{(p as any).billing_frequency}</Chip>}
                        {(p as any).sla_level && <Chip>{(p as any).sla_level}</Chip>}
                      </div>
                    </TD>
                    <TD>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="text-erp-text3 hover:text-erp-text1 transition-colors p-1 rounded hover:bg-erp-bg3"
                          >
                            <Icons.More className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-erp-bg3 border-erp-border0 text-erp-text0 min-w-[180px]" align="end">
                          <DropdownMenuItem
                            className="text-[13px] focus:bg-erp-hover cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}
                          >
                            <Icons.ExternalLink className="w-3.5 h-3.5 mr-2" /> Bekijken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-erp-border0" />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-[13px] focus:bg-erp-hover cursor-pointer">
                              <Dot color={sc} size={5} /> Status wijzigen
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-erp-bg3 border-erp-border0">
                              {statusOptions.map(([key, [label, color]]) => (
                                <DropdownMenuItem
                                  key={key}
                                  className="text-[13px] focus:bg-erp-hover cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, key); }}
                                >
                                  <Dot color={color} size={5} /> {label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-[13px] focus:bg-erp-hover cursor-pointer">
                              Prioriteit
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-erp-bg3 border-erp-border0">
                              {priorityOptions.map(o => (
                                <DropdownMenuItem
                                  key={o.value}
                                  className="text-[13px] focus:bg-erp-hover cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); handlePriorityChange(p.id, o.value); }}
                                >
                                  {o.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator className="bg-erp-border0" />
                          <DropdownMenuItem
                            className="text-[13px] text-erp-red focus:bg-erp-hover cursor-pointer focus:text-erp-red"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Project verwijderen?")) deleteProject.mutate(p.id, { onSuccess: () => toast.success("Verwijderd") });
                            }}
                          >
                            <Icons.Trash className="w-3.5 h-3.5 mr-2" /> Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

export function InvoicesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: invoices = [], isLoading } = useInvoices();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const paid = invoices.filter(i => i.status === "paid").reduce((a, i) => a + (i.total_amount ?? 0), 0);
  const outstanding = invoices.filter(i => i.status === "sent").reduce((a, i) => a + (i.total_amount ?? 0), 0);
  const overdue = invoices.filter(i => i.status === "overdue").reduce((a, i) => a + (i.total_amount ?? 0), 0);

  const statusFlow: Record<string, string> = { draft: "sent", sent: "paid", overdue: "paid" };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Facturen" desc={`${invoices.length} facturen · €${fmt(outstanding + overdue)} openstaand`}>
        <ErpButton primary onClick={() => setDialogOpen(true)}><Icons.Plus className="w-4 h-4" /> Nieuwe factuur</ErpButton>
      </PageHeader>

      <div className="grid grid-cols-3 gap-[14px] mb-5">
        <StatCard label="Betaald (YTD)" value={paid >= 1000 ? `${(paid / 1000).toFixed(1)}K` : String(paid)} prefix="€" change={`${invoices.filter(i => i.status === "paid").length} facturen`} up />
        <StatCard label="Openstaand" value={outstanding >= 1000 ? `${(outstanding / 1000).toFixed(1)}K` : String(outstanding)} prefix="€" change={`${invoices.filter(i => i.status === "sent").length} facturen`} up={false} />
        <StatCard label="Te laat" value={overdue >= 1000 ? `${(overdue / 1000).toFixed(1)}K` : String(overdue)} prefix="€" change={`${invoices.filter(i => i.status === "overdue").length} facturen`} up={false} />
      </div>

      {isLoading ? (
        <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>
      ) : (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead><tr><TH>Factuur</TH><TH>Klant</TH><TH>Bedrag</TH><TH>Status</TH><TH>Betaal</TH><TH>Portaal</TH><TH>Datum</TH><TH></TH></tr></thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 border-b border-erp-border0 text-center text-erp-text3 text-sm">Geen facturen gevonden</td></tr>
              )}
              {invoices.map(inv => {
                const [sl, sc] = invStatus[inv.status] || ["?", "#6b7280"];
                const nextStatus = statusFlow[inv.status];
                const payStatus = (inv as any).payment_status || "unpaid";
                const payColors: Record<string, string> = { unpaid: "#ef4444", pending: "#f59e0b", paid: "#22c55e", overdue: "#ef4444" };
                const payLabels: Record<string, string> = { unpaid: "Onbetaald", pending: "In behandeling", paid: "Betaald", overdue: "Verlopen" };
                return (
                  <TR key={inv.id}>
                    <TD className="font-semibold text-erp-text0 text-xs font-mono">{inv.invoice_number}</TD>
                    <TD className="text-erp-text1">{inv.customer_name ?? "—"}</TD>
                    <TD className="font-semibold">€{fmt(inv.total_amount ?? 0)}</TD>
                    <TD><Badge color={sc}><Dot color={sc} size={5} />{sl}</Badge></TD>
                    <TD>
                      <Badge color={payColors[payStatus] || "#6b7280"}>
                        <Dot color={payColors[payStatus] || "#6b7280"} size={5} />
                        {payLabels[payStatus] || payStatus}
                      </Badge>
                    </TD>
                    <TD>
                      {(inv as any).visible_in_portal ? (
                        <span className="text-erp-green text-xs">Zichtbaar</span>
                      ) : (
                        <span className="text-erp-text3 text-xs">Verborgen</span>
                      )}
                    </TD>
                    <TD className="text-erp-text2 text-xs">
                      {inv.created_at ? format(new Date(inv.created_at), "d MMM yyyy") : "—"}
                    </TD>
                    <TD>
                      <div className="flex gap-1 items-center">
                        {nextStatus && (
                          <button
                            onClick={() => updateInvoice.mutate(
                              { id: inv.id, status: nextStatus, ...(nextStatus === "paid" ? { paid_at: new Date().toISOString() } : {}) },
                              { onSuccess: () => toast.success(`Status → ${invStatus[nextStatus]?.[0] ?? nextStatus}`) }
                            )}
                            className="text-[11px] text-erp-blue hover:underline"
                          >
                            → {invStatus[nextStatus]?.[0] ?? nextStatus}
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm("Factuur verwijderen?")) deleteInvoice.mutate(inv.id, { onSuccess: () => toast.success("Verwijderd") }); }}
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

      <CreateInvoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
