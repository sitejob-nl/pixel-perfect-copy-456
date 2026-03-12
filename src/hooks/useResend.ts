import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

function useOrgId() {
  const { data: org } = useOrganization();
  return org?.organization_id;
}

async function invokeResend(action: string, organization_id: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-resend", {
    body: { action, organization_id, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Webhooks ───
export function useResendWebhooks() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["resend-webhooks", orgId],
    enabled: !!orgId,
    queryFn: () => invokeResend("webhooks.list", orgId!),
  });
}

export function useResendWebhookMutation() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      invokeResend(`webhooks.${action}`, orgId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resend-webhooks"] });
      toast.success("Webhook bijgewerkt");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Templates ───
export function useResendTemplates() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["resend-templates", orgId],
    enabled: !!orgId,
    queryFn: () => invokeResend("templates.list", orgId!),
  });
}

export function useResendTemplateMutation() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      invokeResend(`templates.${action}`, orgId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resend-templates"] });
      toast.success("Template bijgewerkt");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Broadcasts ───
export function useResendBroadcasts() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["resend-broadcasts", orgId],
    enabled: !!orgId,
    queryFn: () => invokeResend("broadcasts.list", orgId!),
  });
}

export function useResendBroadcastMutation() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      invokeResend(`broadcasts.${action}`, orgId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resend-broadcasts"] });
      toast.success("Broadcast bijgewerkt");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Contacts ───
export function useResendContacts() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["resend-contacts", orgId],
    enabled: !!orgId,
    queryFn: () => invokeResend("contacts.list", orgId!),
  });
}

export function useResendContactMutation() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      invokeResend(`contacts.${action}`, orgId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resend-contacts"] });
      toast.success("Contact bijgewerkt");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Domains ───
export function useResendDomains() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["resend-domains", orgId],
    enabled: !!orgId,
    queryFn: () => invokeResend("domains.list", orgId!),
  });
}

export function useResendDomainMutation() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      invokeResend(`domains.${action}`, orgId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resend-domains"] });
      toast.success("Domein bijgewerkt");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
