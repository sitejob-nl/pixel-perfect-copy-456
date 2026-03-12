import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

function useOrgId() {
  const { data: org } = useOrganization();
  return org?.organization_id;
}

export function useEmailTemplates() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-templates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("organization_id", orgId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useEmailTemplate(id: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-template", id],
    enabled: !!id && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEmailTemplate() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; subject: string; html_content: string; design_json?: Json; category?: string; description?: string }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .insert({ ...params, organization_id: orgId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template aangemaakt");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...params }: { id: string; name?: string; subject?: string; html_content?: string; design_json?: Json; category?: string; description?: string }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .update(params)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template opgeslagen");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template verwijderd");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDuplicateTemplate() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: fetchErr } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = src;
      const { data, error } = await supabase
        .from("email_templates")
        .insert({ ...rest, name: `${rest.name} (kopie)`, organization_id: orgId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template gedupliceerd");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Sending ───
export function useSendEmail() {
  return useMutation({
    mutationFn: async (params: { action: string; [key: string]: any }) => {
      const res = await supabase.functions.invoke("send-email", { body: params });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
  });
}

// ─── Email Sends ───
export function useEmailSends(limit = 50) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-sends", orgId, limit],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_sends")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useEmailStats() {
  return useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("send-email", { body: { action: "get-stats" } });
      if (res.error) throw res.error;
      return res.data;
    },
  });
}
