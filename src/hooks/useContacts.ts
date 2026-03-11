import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { Database } from "@/integrations/supabase/types";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];

export interface ContactWithCompany extends ContactRow {
  companies: { name: string; industry: string | null; city: string | null } | null;
}

export function useContacts() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["contacts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(name, industry, city)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactWithCompany[];
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contact)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
