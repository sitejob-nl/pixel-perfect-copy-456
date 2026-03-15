import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Zap, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformType {
  id: string;
  naam: string;
  beschrijving: string;
  categorie: string;
  default_pages: { slug: string; title: string; description: string }[];
  sort_order: number;
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Globe; color: string; border: string }> = {
  website: { label: "Websites", icon: Globe, color: "text-erp-blue", border: "border-erp-blue" },
  platform: { label: "Platforms", icon: Zap, color: "text-erp-purple", border: "border-erp-purple" },
  portal: { label: "Portalen", icon: ShieldCheck, color: "text-erp-green", border: "border-erp-green" },
};

const CATEGORY_ORDER = ["website", "platform", "portal"];

interface Props {
  value: string;
  onChange: (id: string) => void;
  onTypeData?: (type: PlatformType | null) => void;
}

export default function DemoTypeSelector({ value, onChange, onTypeData }: Props) {
  const { data: platformTypes, isLoading } = useQuery({
    queryKey: ["platform-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("demo_platform_types")
        .select("id, naam, beschrijving, categorie, default_pages, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as PlatformType[];
    },
  });

  const handleSelect = (type: PlatformType) => {
    onChange(type.id);
    onTypeData?.(type);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Types laden...</span>
      </div>
    );
  }

  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      cat,
      meta: CATEGORY_META[cat],
      types: (platformTypes || []).filter((t) => t.categorie === cat),
    }))
    .filter((g) => g.types.length > 0);

  return (
    <div className="space-y-5">
      {grouped.map(({ cat, meta, types }) => {
        const Icon = meta.icon;
        return (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", meta.color)} />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {meta.label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {types.map((t) => {
                const isSelected = value === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                      isSelected
                        ? cn("bg-primary/10 ring-1 ring-primary", meta.border)
                        : "border-border bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{t.naam}</span>
                    <span className="text-[11px] leading-tight text-muted-foreground line-clamp-2">
                      {t.beschrijving}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { PlatformType };
