import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { Database } from "@/integrations/supabase/types";

type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
type QuoteLineRow = Database["public"]["Tables"]["quote_lines"]["Row"];
type QuoteLineInsert = Database["public"]["Tables"]["quote_lines"]["Insert"];

export interface QuoteWithLines extends QuoteRow {
  quote_lines: QuoteLineRow[];
  contacts: { first_name: string; last_name: string | null } | null;
}

export function useQuotes() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["quotes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, quote_lines(*), contacts(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteWithLines[];
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lines, ...quote }: QuoteInsert & { lines?: Omit<QuoteLineInsert, "quote_id">[] }) => {
      const { data, error } = await supabase.from("quotes").insert(quote).select().single();
      if (error) throw error;
      if (lines && lines.length > 0) {
        const { error: lineError } = await supabase
          .from("quote_lines")
          .insert(lines.map(l => ({ ...l, quote_id: data.id })));
        if (lineError) throw lineError;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuoteRow> & { id: string }) => {
      const { error } = await supabase.from("quotes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}
