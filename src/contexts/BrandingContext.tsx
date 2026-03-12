import React, { createContext, useContext, useEffect } from "react";
import { useOrgDetails, type OrgDetails } from "@/hooks/useOrgDetails";

interface BrandingContextType {
  org: OrgDetails | null | undefined;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({ org: null, isLoading: true });

export function useBranding() {
  return useContext(BrandingContext);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslString(hsl: { h: number; s: number; l: number }): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/** Skip colors that are too light (>85% lightness) or too dark (<15%) for accent use on dark bg */
function isSafeAccentColor(hsl: { h: number; s: number; l: number }): boolean {
  return hsl.l >= 15 && hsl.l <= 85 && hsl.s >= 10;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: org, isLoading } = useOrgDetails();

  useEffect(() => {
    if (!org) return;

    const root = document.documentElement;

    if (org.primary_color) {
      const hsl = hexToHsl(org.primary_color);
      if (hsl && isSafeAccentColor(hsl)) {
        const str = hslString(hsl);
        root.style.setProperty("--erp-blue", str);
        root.style.setProperty("--primary", str);
        root.style.setProperty("--ring", str);
      }
    }

    if (org.secondary_color) {
      const hsl = hexToHsl(org.secondary_color);
      if (hsl && isSafeAccentColor(hsl)) {
        root.style.setProperty("--erp-purple", hslString(hsl));
      }
    }

    if (org.bg_color) {
      const hsl = hexToHsl(org.bg_color);
      if (hsl) {
        const str = hslString(hsl);
        const isLight = hsl.l > 50;
        root.style.setProperty("--background", str);
        root.style.setProperty("--erp-bg-0", str);
        const bg1 = hslString({ ...hsl, l: isLight ? Math.max(hsl.l - 2, 0) : Math.min(hsl.l + 2, 100) });
        const bg2 = hslString({ ...hsl, l: isLight ? Math.max(hsl.l - 5, 0) : Math.min(hsl.l + 5, 100) });
        const bg3 = hslString({ ...hsl, l: isLight ? Math.max(hsl.l - 7, 0) : Math.min(hsl.l + 7, 100) });
        const bg4 = hslString({ ...hsl, l: isLight ? Math.max(hsl.l - 10, 0) : Math.min(hsl.l + 10, 100) });
        const bgHover = hslString({ ...hsl, l: isLight ? Math.max(hsl.l - 6, 0) : Math.min(hsl.l + 6, 100) });
        root.style.setProperty("--erp-bg-1", bg1);
        root.style.setProperty("--erp-bg-2", bg2);
        root.style.setProperty("--erp-bg-3", bg3);
        root.style.setProperty("--erp-bg-4", bg4);
        root.style.setProperty("--erp-bg-hover", bgHover);
        root.style.setProperty("--card", bg1);
        root.style.setProperty("--popover", bg1);
        root.style.setProperty("--sidebar-background", bg1);

        // Adaptive text colors
        if (isLight) {
          root.style.setProperty("--foreground", "0 0% 10%");
          root.style.setProperty("--card-foreground", "0 0% 10%");
          root.style.setProperty("--popover-foreground", "0 0% 10%");
          root.style.setProperty("--sidebar-foreground", "0 0% 10%");
          root.style.setProperty("--erp-text-0", "0 0% 10%");
          root.style.setProperty("--erp-text-1", "0 0% 25%");
          root.style.setProperty("--erp-text-2", "0 0% 40%");
          root.style.setProperty("--erp-text-3", "0 0% 55%");
          root.style.setProperty("--erp-border-0", `${hsl.h} ${Math.min(hsl.s, 15)}% ${Math.max(hsl.l - 12, 0)}%`);
          root.style.setProperty("--erp-border-1", `${hsl.h} ${Math.min(hsl.s, 15)}% ${Math.max(hsl.l - 18, 0)}%`);
          root.style.setProperty("--border", `${hsl.h} ${Math.min(hsl.s, 15)}% ${Math.max(hsl.l - 12, 0)}%`);
          root.style.setProperty("--input", `${hsl.h} ${Math.min(hsl.s, 15)}% ${Math.max(hsl.l - 8, 0)}%`);
          root.style.setProperty("--muted", `${hsl.h} ${Math.min(hsl.s, 10)}% ${Math.max(hsl.l - 6, 0)}%`);
          root.style.setProperty("--muted-foreground", "0 0% 40%");
          root.style.setProperty("--secondary", `${hsl.h} ${Math.min(hsl.s, 10)}% ${Math.max(hsl.l - 8, 0)}%`);
          root.style.setProperty("--secondary-foreground", "0 0% 10%");
          root.style.setProperty("--accent", `${hsl.h} ${Math.min(hsl.s, 10)}% ${Math.max(hsl.l - 8, 0)}%`);
          root.style.setProperty("--accent-foreground", "0 0% 10%");
        }
      }
    }

    if (org.font_family && org.font_family !== "Inter") {
      root.style.setProperty("--font-sans", `"${org.font_family}", sans-serif`);
    }

    return () => {
      const props = [
        "--erp-blue", "--primary", "--ring", "--erp-purple", "--font-sans",
        "--background", "--foreground", "--card-foreground", "--popover-foreground",
        "--sidebar-foreground", "--erp-bg-0", "--erp-bg-1", "--erp-bg-2", "--erp-bg-3",
        "--erp-bg-4", "--erp-bg-hover", "--card", "--popover", "--sidebar-background",
        "--erp-text-0", "--erp-text-1", "--erp-text-2", "--erp-text-3",
        "--erp-border-0", "--erp-border-1", "--border", "--input",
        "--muted", "--muted-foreground", "--secondary", "--secondary-foreground",
        "--accent", "--accent-foreground",
      ];
      props.forEach((p) => root.style.removeProperty(p));
    };
  }, [org?.primary_color, org?.secondary_color, org?.bg_color, org?.font_family]);

  return (
    <BrandingContext.Provider value={{ org, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}
