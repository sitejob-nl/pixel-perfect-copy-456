import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOrganization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organization", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, slug)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // No rows
        throw error;
      }
      return data;
    },
  });
}
