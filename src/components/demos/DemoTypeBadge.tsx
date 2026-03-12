import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  website: "bg-erp-blue/15 text-erp-blue",
  dashboard: "bg-erp-green/15 text-erp-green",
  client_portal: "bg-erp-purple/15 text-erp-purple",
  employee_portal: "bg-erp-amber/15 text-erp-amber",
  crm: "bg-erp-cyan/15 text-erp-cyan",
  erp: "bg-erp-orange/15 text-erp-orange",
};

const TYPE_LABELS: Record<string, string> = {
  website: "Website",
  dashboard: "Dashboard",
  client_portal: "Klantportaal",
  employee_portal: "Medewerkersportaal",
  crm: "CRM",
  erp: "ERP",
};

export default function DemoTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TYPE_STYLES[type] || "bg-muted text-muted-foreground")}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}
