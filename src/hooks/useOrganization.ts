import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOrganization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organization", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // First try active membership
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, slug), is_active")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!error && data) {
        return { ...data, deactivated: false };
      }

      if (error && error.code !== "PGRST116") throw error;

      // Check for inactive membership
      const { data: inactive, error: inactiveErr } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, slug), is_active")
        .eq("user_id", user!.id)
        .eq("is_active", false)
        .limit(1)
        .single();

      if (!inactiveErr && inactive) {
        return { ...inactive, deactivated: true };
      }

      return null; // No membership at all
    },
  });
}
