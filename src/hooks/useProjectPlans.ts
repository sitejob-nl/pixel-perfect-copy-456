import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { Database, Json } from "@/integrations/supabase/types";

type PlanRow = Database["public"]["Tables"]["project_plans"]["Row"];
type SectionRow = Database["public"]["Tables"]["project_plan_sections"]["Row"];
type TemplateRow = Database["public"]["Tables"]["project_plan_templates"]["Row"];
type LibraryRow = Database["public"]["Tables"]["project_plan_section_library"]["Row"];

export interface PlanWithCompany extends PlanRow {
  companies: { name: string } | null;
}

export interface PlanFull extends PlanRow {
  companies: { name: string; address_line1: string | null; postal_code: string | null; city: string | null; kvk_number: string | null; email: string | null; phone: string | null } | null;
  contacts: { first_name: string; last_name: string | null; email: string | null } | null;
  project_plan_sections: SectionRow[];
}

// ─── List all plans ───
export function useProjectPlans() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["project_plans", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_plans")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PlanWithCompany[];
    },
  });
}

// ─── Single plan with sections ───
export function useProjectPlan(planId: string | undefined) {
  return useQuery({
    queryKey: ["project_plan", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_plans")
        .select("*, companies(name, address_line1, postal_code, city, kvk_number, email, phone), contacts(first_name, last_name, email), project_plan_sections(*)")
        .eq("id", planId!)
        .single();
      if (error) throw error;
      // Sort sections
      const plan = data as unknown as PlanFull;
      plan.project_plan_sections.sort((a, b) => a.sort_order - b.sort_order);
      return plan;
    },
  });
}

// ─── Templates ───
export function useProjectPlanTemplates() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["project_plan_templates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_plan_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as TemplateRow[];
    },
  });
}

// ─── Generate plan via RPC ───
export function useGenerateProjectPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      p_organization_id: string;
      p_template_id: string;
      p_company_id?: string;
      p_contact_id?: string;
      p_project_id?: string;
      p_deal_id?: string;
      p_title?: string;
    }) => {
      const { data, error } = await supabase.rpc("generate_project_plan", args);
      if (error) throw error;
      return data as unknown as { success: boolean; plan_id: string; title: string; sections_created: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_plans"] }),
  });
}

// ─── Update plan ───
export function useUpdateProjectPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { error } = await supabase
        .from("project_plans")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project_plan", vars.id] });
      qc.invalidateQueries({ queryKey: ["project_plans"] });
    },
  });
}

// ─── Delete plan ───
export function useDeleteProjectPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_plans"] }),
  });
}

// ─── Update section (debounced at call site) ───
export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { error } = await supabase
        .from("project_plan_sections")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      // Don't invalidate on every keystroke — the builder reads from local state
    },
  });
}

// ─── Add section ───
export function useAddSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (section: Database["public"]["Tables"]["project_plan_sections"]["Insert"]) => {
      const { data, error } = await supabase
        .from("project_plan_sections")
        .insert(section)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project_plan", data.plan_id] });
    },
  });
}

// ─── Delete section ───
export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase.from("project_plan_sections").delete().eq("id", id);
      if (error) throw error;
      return planId;
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: ["project_plan", planId] });
    },
  });
}

// ─── Section library ───
export function useSectionLibrary(sectionType?: string) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["section_library", orgId, sectionType],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("project_plan_section_library")
        .select("*")
        .eq("is_active", true)
        .order("use_count", { ascending: false });
      if (sectionType) q = q.eq("section_type", sectionType);
      const { data, error } = await q;
      if (error) throw error;
      return data as LibraryRow[];
    },
  });
}

// ─── Save to library ───
export function useSaveToLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Database["public"]["Tables"]["project_plan_section_library"]["Insert"]) => {
      const { data, error } = await supabase
        .from("project_plan_section_library")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["section_library"] }),
  });
}
