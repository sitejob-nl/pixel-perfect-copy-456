import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  website: "bg-erp-blue/15 text-erp-blue",
  webshop: "bg-erp-blue/15 text-erp-blue",
  landing: "bg-erp-blue/15 text-erp-blue",
  erp: "bg-erp-purple/15 text-erp-purple",
  crm: "bg-erp-purple/15 text-erp-purple",
  werkbon: "bg-erp-purple/15 text-erp-purple",
  planning: "bg-erp-purple/15 text-erp-purple",
  hrm: "bg-erp-purple/15 text-erp-purple",
  boekhouding: "bg-erp-purple/15 text-erp-purple",
  portal: "bg-erp-green/15 text-erp-green",
  reservering: "bg-erp-green/15 text-erp-green",
};

const TYPE_LABELS: Record<string, string> = {
  website: "Website",
  webshop: "Webshop",
  landing: "Landing Page",
  erp: "ERP",
  crm: "CRM",
  werkbon: "Werkbon",
  planning: "Planning",
  hrm: "HRM",
  boekhouding: "Boekhouding",
  portal: "Klantportaal",
  reservering: "Reservering",
};

export default function DemoTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TYPE_STYLES[type] || "bg-muted text-muted-foreground")}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}
