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

function hexToHsl(hex: string): string | null {
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

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: org, isLoading } = useOrgDetails();

  useEffect(() => {
    if (!org) return;

    const root = document.documentElement;

    if (org.primary_color) {
      const hsl = hexToHsl(org.primary_color);
      if (hsl) {
        root.style.setProperty("--erp-blue", hsl);
        root.style.setProperty("--primary", hsl);
        root.style.setProperty("--ring", hsl);
      }
    }

    if (org.secondary_color) {
      const hsl = hexToHsl(org.secondary_color);
      if (hsl) {
        root.style.setProperty("--erp-purple", hsl);
      }
    }

    if (org.font_family && org.font_family !== "Inter") {
      root.style.setProperty("--font-sans", `"${org.font_family}", sans-serif`);
    }

    return () => {
      // Reset on unmount (org switch)
      root.style.removeProperty("--erp-blue");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--erp-purple");
      root.style.removeProperty("--font-sans");
    };
  }, [org?.primary_color, org?.secondary_color, org?.font_family]);

  return (
    <BrandingContext.Provider value={{ org, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}
