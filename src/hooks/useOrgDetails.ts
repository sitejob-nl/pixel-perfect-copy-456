import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  iban: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  default_currency: string | null;
  default_vat_rate: number | null;
  invoice_prefix: string | null;
  quote_prefix: string | null;
  project_prefix: string | null;
}

export function useOrgDetails() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["org-details", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .single();
      if (error) throw error;
      return data as OrgDetails;
    },
  });
}

export function useUpdateOrgDetails() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (updates: Partial<OrgDetails>) => {
      const orgId = org?.organization_id;
      if (!orgId) throw new Error("Geen organisatie");

      const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-details"] });
      qc.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

export function useUploadOrgLogo() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (file: File) => {
      const orgId = org?.organization_id;
      if (!orgId) throw new Error("Geen organisatie");

      const ext = file.name.split(".").pop();
      const path = `${orgId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("org-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("org-assets")
        .getPublicUrl(path);

      // Add cache-buster
      const logoUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: logoUrl })
        .eq("id", orgId);
      if (updateError) throw updateError;

      return logoUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-details"] });
      qc.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}
