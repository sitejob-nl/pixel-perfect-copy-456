import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";

// ─── Portal Sessions ───

export function usePortalSessions() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["portal-sessions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_sessions")
        .select("*, contacts(first_name, last_name, email), companies(name), projects(name, project_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get unread counts per portal
      const ids = (data || []).map((s: any) => s.id);
      let unreadMap: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: msgs } = await supabase
          .from("portal_messages")
          .select("portal_session_id")
          .in("portal_session_id", ids)
          .eq("sender_type", "client")
          .eq("is_read", false);
        (msgs || []).forEach((m: any) => {
          unreadMap[m.portal_session_id] = (unreadMap[m.portal_session_id] || 0) + 1;
        });
      }

      return (data || []).map((s: any) => ({ ...s, unread_count: unreadMap[s.id] || 0 }));
    },
  });
}

export function useCreatePortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      contact_id?: string | null;
      company_id?: string | null;
      project_id?: string | null;
      portal_name?: string;
      welcome_message?: string;
      password_required?: boolean;
      password_hash?: string | null;
      enabled_sections?: string[];
      expires_at?: string;
    }) => {
      const payload: any = {
        organization_id: input.organization_id,
        contact_id: input.contact_id || null,
        company_id: input.company_id || null,
        project_id: input.project_id || null,
        portal_name: input.portal_name || null,
        welcome_message: input.welcome_message || null,
        password_required: input.password_required || false,
        enabled_sections: input.enabled_sections
          ? JSON.stringify(input.enabled_sections)
          : undefined,
      };
      if (input.expires_at) payload.expires_at = input.expires_at;

      const { data, error } = await supabase
        .from("portal_sessions")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-sessions"] }),
  });
}

// ─── Onboarding Templates ───

export function useOnboardingTemplates() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["onboarding-templates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organization_id: string; name: string; description?: string; category?: string; questions: any[] }) => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .insert({
          organization_id: input.organization_id,
          name: input.name,
          description: input.description || null,
          category: input.category || "general",
          questions: input.questions as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-templates"] }),
  });
}

export function useApplyOnboardingToPortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ portalSessionId, templateId, organizationId }: { portalSessionId: string; templateId: string; organizationId: string }) => {
      // Get template
      const { data: tpl, error: tplErr } = await supabase
        .from("onboarding_templates")
        .select("questions")
        .eq("id", templateId)
        .single();
      if (tplErr) throw tplErr;

      const questions = (tpl.questions as any[]) || [];
      if (questions.length === 0) throw new Error("Template heeft geen vragen");

      // We need a project_id for onboarding_questions - get it from portal session
      const { data: session } = await supabase
        .from("portal_sessions")
        .select("project_id")
        .eq("id", portalSessionId)
        .single();

      const projectId = session?.project_id;
      if (!projectId) throw new Error("Portal moet aan een project gekoppeld zijn voor onboarding");

      const rows = questions.map((q: any, idx: number) => ({
        organization_id: organizationId,
        project_id: projectId,
        portal_session_id: portalSessionId,
        question: q.question || q.label || `Vraag ${idx + 1}`,
        question_type: q.type || "text",
        options: q.options || null,
        is_required: q.required ?? false,
        sort_order: idx,
        section_title: q.section || null,
        description: q.description || null,
        placeholder: q.placeholder || null,
      }));

      const { error } = await supabase.from("onboarding_questions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-onboarding"] }),
  });
}

// ─── Onboarding Questions & Responses ───

export function usePortalOnboarding(portalSessionId: string | null) {
  return useQuery({
    queryKey: ["portal-onboarding", portalSessionId],
    enabled: !!portalSessionId,
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from("onboarding_questions")
        .select("*")
        .eq("portal_session_id", portalSessionId!)
        .order("sort_order");
      if (error) throw error;

      // Get responses for these questions
      const qIds = (questions || []).map((q: any) => q.id);
      let responses: any[] = [];
      if (qIds.length > 0) {
        const { data: resp } = await supabase
          .from("onboarding_responses")
          .select("*")
          .in("question_id", qIds);
        responses = resp || [];
      }

      const respMap: Record<string, any> = {};
      responses.forEach((r: any) => { respMap[r.question_id] = r; });

      return (questions || []).map((q: any) => ({
        ...q,
        response: respMap[q.id] || null,
      }));
    },
  });
}

// ─── File Requests ───

export function usePortalFileRequests(portalSessionId: string | null) {
  return useQuery({
    queryKey: ["portal-file-requests", portalSessionId],
    enabled: !!portalSessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_file_requests")
        .select("*")
        .eq("portal_session_id", portalSessionId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateFileRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      portal_session_id: string;
      title: string;
      description?: string;
      required?: boolean;
      accepted_types?: string[];
    }) => {
      const { error } = await supabase.from("portal_file_requests").insert({
        organization_id: input.organization_id,
        portal_session_id: input.portal_session_id,
        title: input.title,
        description: input.description || null,
        required: input.required ?? true,
        accepted_types: input.accepted_types || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-file-requests"] }),
  });
}

// ─── Portal Messages ───

export function usePortalMessages(portalSessionId: string | null) {
  return useQuery({
    queryKey: ["portal-messages", portalSessionId],
    enabled: !!portalSessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_messages")
        .select("*")
        .eq("portal_session_id", portalSessionId!)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });
}

export function useSendPortalMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ portalSessionId, organizationId, message }: { portalSessionId: string; organizationId: string; message: string }) => {
      const { error } = await supabase.from("portal_messages").insert({
        organization_id: organizationId,
        portal_session_id: portalSessionId,
        sender_type: "admin",
        sender_name: user?.email?.split("@")[0] || "Admin",
        message,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["portal-messages", vars.portalSessionId] }),
  });
}

export function useMarkMessagesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (portalSessionId: string) => {
      const { error } = await supabase
        .from("portal_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("portal_session_id", portalSessionId)
        .eq("sender_type", "client")
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-sessions"] }),
  });
}

// ─── Portal Activity ───

export function usePortalActivity(portalSessionId: string | null) {
  return useQuery({
    queryKey: ["portal-activity", portalSessionId],
    enabled: !!portalSessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_activity_log")
        .select("*")
        .eq("portal_session_id", portalSessionId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}
