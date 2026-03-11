import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { Database } from "@/integrations/supabase/types";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
type InvoiceLineRow = Database["public"]["Tables"]["invoice_lines"]["Row"];
type InvoiceLineInsert = Database["public"]["Tables"]["invoice_lines"]["Insert"];

export interface InvoiceWithLines extends InvoiceRow {
  invoice_lines: InvoiceLineRow[];
  contacts: { first_name: string; last_name: string | null } | null;
}

export function useInvoices() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["invoices", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_lines(*), contacts(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InvoiceWithLines[];
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lines, ...invoice }: InvoiceInsert & { lines?: Omit<InvoiceLineInsert, "invoice_id">[] }) => {
      const { data, error } = await supabase.from("invoices").insert(invoice).select().single();
      if (error) throw error;
      if (lines && lines.length > 0) {
        const { error: lineError } = await supabase
          .from("invoice_lines")
          .insert(lines.map(l => ({ ...l, invoice_id: data.id })));
        if (lineError) throw lineError;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InvoiceRow> & { id: string }) => {
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Lines are cascade deleted via FK
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
