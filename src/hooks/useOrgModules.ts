import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

// For the current org (used by sidebar to show/hide modules)
export function useOrgModules() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["org-modules", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_modules")
        .select("*")
        .eq("organization_id", orgId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// For super admin: get modules for any org
export function useOrgModulesAdmin(orgId: string | null) {
  return useQuery({
    queryKey: ["org-modules", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_modules")
        .select("*")
        .eq("organization_id", orgId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// Super admin: toggle a module
export function useToggleModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, module, enabled }: {
      orgId: string;
      module: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from("organization_modules")
        .update({ [module]: enabled } as any)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["org-modules", vars.orgId] });
      qc.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });
}
