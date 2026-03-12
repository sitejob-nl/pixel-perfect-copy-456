import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export function useContractTemplates() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["contract-templates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contract_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useContractVariableSources() {
  return useQuery({
    queryKey: ["contract-variable-sources"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contract_variable_sources")
        .select("*")
        .order("category, display_label");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useContracts() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["contracts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contracts")
        .select("*, contacts(first_name, last_name, email), companies(name), contract_templates(name), contract_signing_sessions(id, signer_name, signer_role, status, signed_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useContract(id: string | null) {
  return useQuery({
    queryKey: ["contract", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contracts")
        .select("*, contacts(*), companies(*), deals(*), projects(*), quotes(*), contract_templates(*), contract_signing_sessions(*), contract_audit_logs(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useResolveVariables(params: {
  contactId?: string; companyId?: string; dealId?: string;
  projectId?: string; quoteId?: string;
}) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["resolve-variables", orgId, params],
    enabled: !!orgId && Object.values(params).some(Boolean),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("resolve_contract_variables", {
        p_org_id: orgId,
        p_contact_id: params.contactId || null,
        p_company_id: params.companyId || null,
        p_deal_id: params.dealId || null,
        p_project_id: params.projectId || null,
        p_quote_id: params.quoteId || null,
      });
      if (error) throw error;
      return data as Record<string, string>;
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();
  return useMutation({
    mutationFn: async (contract: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from("contracts")
        .insert({ ...contract, organization_id: org!.organization_id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("contracts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["contract"] });
    },
  });
}

export function useCreateSigningSession() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();
  return useMutation({
    mutationFn: async (session: {
      contract_id: string; signer_name: string; signer_email: string;
      signer_phone: string; signer_role: string; signing_order?: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from("contract_signing_sessions")
        .insert({
          ...session,
          organization_id: org!.organization_id,
          sms_code_hash: "pending",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract"] }),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();
  return useMutation({
    mutationFn: async (template: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from("contract_templates")
        .insert({ ...template, organization_id: org!.organization_id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract-templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("contract_templates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract-templates"] }),
  });
}
