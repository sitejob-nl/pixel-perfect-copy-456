import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";

export interface EmailThread {
  thread_id: string;
  subject: string;
  last_message_at: string;
  message_count: number;
  has_unread: boolean;
  last_snippet: string;
  sender_name: string;
  sender_email: string;
  category: string | null;
  matched_contact_id: string | null;
  matched_company_id: string | null;
  matched_company_name: string | null;
  matched_project_id: string | null;
  matched_project_name: string | null;
  email_ids: string[];
}

export interface ThreadEmail {
  id: string;
  thread_id: string;
  subject: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  received_at: string;
  snippet: string;
  body_text: string | null;
  body_html: string | null;
  direction: string;
  has_attachments: boolean;
  is_read: boolean;
  ai_processed: boolean;
  matched_contact_id: string | null;
  matched_company_id: string | null;
}

export interface AiSuggestion {
  id: string;
  source_id: string;
  source_type: string;
  suggestion_type: string;
  title: string;
  description: string | null;
  confidence: number | null;
  suggested_data: Record<string, any> | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

export function useEmailThreads(category?: string) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["email-threads", orgId, category],
    enabled: !!orgId,
    refetchInterval: 60000,
    queryFn: async () => {
      let query = (supabase as any)
        .from("v_email_threads")
        .select("*")
        .eq("organization_id", orgId)
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (category && category !== "alle") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailThread[];
    },
  });
}

export function useThreadEmails(threadId: string | null) {
  return useQuery({
    queryKey: ["thread-emails", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("google_emails")
        .select("*")
        .eq("thread_id", threadId)
        .order("received_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ThreadEmail[];
    },
  });
}

export function useThreadSuggestions(emailIds: string[]) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["thread-suggestions", emailIds],
    enabled: emailIds.length > 0 && !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_suggestions")
        .select("*")
        .eq("source_type", "email")
        .in("source_id", emailIds)
        .order("confidence", { ascending: false });
      if (error) throw error;
      return (data || []) as AiSuggestion[];
    },
  });
}

export function usePendingSuggestionCount() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["pending-suggestion-count", orgId],
    enabled: !!orgId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("ai_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function usePendingSuggestionsByThread(orgId?: string) {
  return useQuery({
    queryKey: ["pending-suggestions-by-thread", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_suggestions")
        .select("source_id")
        .eq("organization_id", orgId)
        .eq("source_type", "email")
        .eq("status", "pending");
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.source_id));
    },
  });
}

export function useApproveSuggestion() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data, error } = await (supabase as any).rpc("fn_approve_suggestion", {
        p_suggestion_id: suggestionId,
        p_user_id: user?.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread-suggestions"] });
      qc.invalidateQueries({ queryKey: ["pending-suggestion-count"] });
      qc.invalidateQueries({ queryKey: ["pending-suggestions-by-thread"] });
    },
  });
}

export function useRejectSuggestion() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data, error } = await (supabase as any).rpc("fn_reject_suggestion", {
        p_suggestion_id: suggestionId,
        p_user_id: user?.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread-suggestions"] });
      qc.invalidateQueries({ queryKey: ["pending-suggestion-count"] });
      qc.invalidateQueries({ queryKey: ["pending-suggestions-by-thread"] });
    },
  });
}

export function useGenerateSuggestions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      const { data, error } = await (supabase as any).rpc("fn_email_generate_suggestions", {
        p_email_id: emailId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread-suggestions"] });
      qc.invalidateQueries({ queryKey: ["pending-suggestion-count"] });
    },
  });
}

export function useSuggestionStats() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["suggestion-stats", orgId],
    enabled: !!orgId,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_suggestion_counts")
        .select("*")
        .eq("organization_id", orgId);
      if (error) throw error;
      return (data?.[0] || { pending: 0, approved_today: 0, rejected_today: 0 }) as {
        pending: number;
        approved_today: number;
        rejected_today: number;
      };
    },
  });
}
