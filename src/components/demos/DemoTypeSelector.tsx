import { Globe, LayoutDashboard, Users, Briefcase, Database, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_TYPES = [
  { value: "website", label: "Website", icon: Globe, color: "text-erp-blue" },
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-erp-green" },
  { value: "client_portal", label: "Klantportaal", icon: Users, color: "text-erp-purple" },
  { value: "employee_portal", label: "Medewerkersportaal", icon: Briefcase, color: "text-erp-amber" },
  { value: "crm", label: "CRM", icon: Database, color: "text-erp-cyan" },
  { value: "erp", label: "ERP", icon: Building2, color: "text-erp-orange" },
] as const;

export type DemoType = (typeof DEMO_TYPES)[number]["value"];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function DemoTypeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {DEMO_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
            value === t.value
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-card hover:border-muted-foreground/30"
          )}
        >
          <t.icon className={cn("h-6 w-6", t.color)} />
          <span className="text-xs font-medium text-foreground">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export { DEMO_TYPES };
