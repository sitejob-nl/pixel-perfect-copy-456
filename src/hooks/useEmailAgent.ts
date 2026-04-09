import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";

export interface EmailInboxItem {
  id: string;
  organization_id: string;
  gmail_id: string;
  gmail_thread_id: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_snippet: string | null;
  gmail_date: string | null;
  category: string;
  confidence: number | null;
  ai_summary: string | null;
  ai_action: string | null;
  ai_sentiment: string | null;
  company_id: string | null;
  project_id: string | null;
  gmail_label: string | null;
  draft_gmail_id: string | null;
  draft_status: string;
  draft_body: string | null;
  auto_replied: boolean;
  processed_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  companies?: { name: string } | null;
  projects?: { name: string } | null;
}

export function useEmailInbox(category?: string) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["email-inbox", orgId, category],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("email_inbox")
        .select("*, companies(name), projects(name)")
        .eq("organization_id", orgId)
        .order("gmail_date", { ascending: false })
        .limit(100);

      if (category && category !== "all") {
        if (category === "drafts") {
          query = query.eq("draft_status", "pending");
        } else if (category === "urgent") {
          query = query.or("ai_sentiment.eq.urgent,ai_action.eq.urgent");
        } else {
          query = query.eq("category", category);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailInboxItem[];
    },
    refetchInterval: 30000,
  });
}

/** Fetch all email_inbox items indexed by gmail_thread_id for quick lookup */
export function useEmailInboxMap() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["email-inbox-map", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_inbox")
        .select("gmail_thread_id, ai_summary, ai_sentiment, ai_action, category, confidence, draft_status, draft_body, id")
        .eq("organization_id", orgId)
        .not("gmail_thread_id", "is", null)
        .order("gmail_date", { ascending: false });

      if (error) throw error;

      const map: Record<string, EmailInboxItem> = {};
      for (const item of data || []) {
        // Keep the most recent per thread
        if (!map[item.gmail_thread_id]) {
          map[item.gmail_thread_id] = item;
        }
      }
      return map;
    },
    refetchInterval: 30000,
  });
}

/** Fetch email_inbox record for a specific thread */
export function useEmailInboxByThread(threadId: string | null) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["email-inbox-thread", orgId, threadId],
    enabled: !!orgId && !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_inbox")
        .select("*, companies(name), projects(name)")
        .eq("organization_id", orgId)
        .eq("gmail_thread_id", threadId)
        .order("gmail_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as EmailInboxItem | null;
    },
  });
}

export function useEmailInboxStats() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["email-inbox-stats", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_inbox")
        .select("category, ai_action, ai_sentiment, draft_status")
        .eq("organization_id", orgId);

      if (error) throw error;

      const items = data || [];
      return {
        total: items.length,
        urgent: items.filter(
          (i: any) => i.ai_sentiment === "urgent" || i.ai_action === "urgent"
        ).length,
        reply_needed: items.filter((i: any) => i.ai_action === "reply_needed").length,
        pending_drafts: items.filter((i: any) => i.draft_status === "pending").length,
        klant: items.filter((i: any) => i.category === "klant").length,
        lead: items.filter((i: any) => i.category === "lead").length,
        reclame: items.filter((i: any) => i.category === "reclame").length,
      };
    },
    refetchInterval: 30000,
  });
}

export function useSendDraft() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inboxId: string) => {
      const res = await fetch(
        `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/email-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "send-draft", inbox_id: inboxId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij versturen");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-inbox"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-map"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-thread"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-stats"] });
    },
  });
}

export function useRejectDraft() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inboxId: string) => {
      const res = await fetch(
        `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/email-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "reject-draft", inbox_id: inboxId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij afwijzen");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-inbox"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-map"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-thread"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-stats"] });
    },
  });
}

export function useProcessManual() {
  const { session } = useAuth();
  const { data: org } = useOrganization();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId?: string) => {
      const res = await fetch(
        `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/email-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: "process-manual",
            organization_id: org?.organization_id,
            connection_id: connectionId,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij verwerken");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-inbox"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-map"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-thread"] });
      qc.invalidateQueries({ queryKey: ["email-inbox-stats"] });
    },
  });
}
