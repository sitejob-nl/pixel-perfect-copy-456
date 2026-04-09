import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadResearch = Database["public"]["Tables"]["lead_research"]["Row"];
type OutreachMessage = Database["public"]["Tables"]["outreach_messages"]["Row"];
type PreCallReport = Database["public"]["Tables"]["pre_call_reports"]["Row"];

const OUTREACH_API = "http://204.168.221.107:8100";

export type LeadStatus =
  | "new" | "researching" | "qualified" | "outreach_active"
  | "connected" | "interested" | "demo_sent"
  | "appointment_booked" | "converted";

export const LEAD_STATUSES: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "Nieuw", color: "#6b7280" },
  { key: "researching", label: "Research", color: "hsl(263,86%,77%)" },
  { key: "qualified", label: "Gekwalificeerd", color: "hsl(225,93%,64%)" },
  { key: "outreach_active", label: "Outreach actief", color: "hsl(187,92%,53%)" },
  { key: "connected", label: "Verbonden", color: "hsl(43,96%,56%)" },
  { key: "interested", label: "Geïnteresseerd", color: "hsl(27,96%,61%)" },
  { key: "demo_sent", label: "Demo verstuurd", color: "hsl(263,86%,77%)" },
  { key: "appointment_booked", label: "Afspraak", color: "hsl(160,67%,52%)" },
  { key: "converted", label: "Geconverteerd", color: "hsl(160,67%,42%)" },
];

export function useLeadFunnel() {
  return useQuery({
    queryKey: ["outreach-funnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      LEAD_STATUSES.forEach(s => { counts[s.key] = 0; });
      data?.forEach(l => { counts[l.status] = (counts[l.status] ?? 0) + 1; });
      return counts;
    },
  });
}

export function useLeads(status?: string) {
  return useQuery({
    queryKey: ["outreach-leads", status],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("*")
        .order("updated_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useAttentionLeads() {
  return useQuery({
    queryKey: ["outreach-attention"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .in("status", ["interested", "appointment_booked"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useRecentMessages() {
  return useQuery({
    queryKey: ["outreach-recent-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_messages")
        .select("*, leads(company_name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as (OutreachMessage & { leads: { company_name: string } | null })[];
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["outreach-lead", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Lead;
    },
  });
}

export function useLeadResearch(leadId: string | undefined) {
  return useQuery({
    queryKey: ["outreach-research", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_research")
        .select("*")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LeadResearch | null;
    },
  });
}

export function useLeadMessages(leadId: string | undefined) {
  return useQuery({
    queryKey: ["outreach-lead-messages", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_messages")
        .select("*")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as OutreachMessage[];
    },
  });
}

export function usePreCallReport(leadId: string | undefined) {
  return useQuery({
    queryKey: ["outreach-precall", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pre_call_reports")
        .select("*")
        .eq("lead_id", leadId!)
        .maybeSingle();
      if (error) throw error;
      return data as PreCallReport | null;
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-leads"] });
      qc.invalidateQueries({ queryKey: ["outreach-funnel"] });
      qc.invalidateQueries({ queryKey: ["outreach-attention"] });
      qc.invalidateQueries({ queryKey: ["outreach-lead"] });
    },
  });
}

export function useStartOutreachSequence(apiKey: string) {
  return useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`${OUTREACH_API}/api/leads/${leadId}/start-sequence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Outreach API error: ${res.status} — ${body}`);
      }
      return res.json();
    },
  });
}

export function usePauseOutreach(apiKey: string) {
  const updateStatus = useUpdateLeadStatus();
  return useMutation({
    mutationFn: async (leadId: string) => {
      // Notify VPS API
      await fetch(`${OUTREACH_API}/api/leads/${leadId}/pause`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
      }).catch(() => {}); // best effort
      // Update local status
      await updateStatus.mutateAsync({ id: leadId, status: "qualified" });
    },
  });
}
