import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

export function useDemos() {
  const { user } = useAuth();
  const { data: orgData } = useOrganization();
  const orgId = (orgData?.organizations as any)?.id;

  return useQuery({
    queryKey: ["demos", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demos")
        .select("*, contacts(first_name, last_name, email)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDemo(id: string | undefined) {
  return useQuery({
    queryKey: ["demo", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demos")
        .select("*, contacts(first_name, last_name, email, company_id, companies(name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useDemoVersions(demoId: string | undefined) {
  return useQuery({
    queryKey: ["demo-versions", demoId],
    enabled: !!demoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_versions")
        .select("*")
        .eq("demo_id", demoId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePublicDemo(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-demo", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demos")
        .select("*")
        .eq("public_slug", slug!)
        .eq("is_public", true)
        .single();
      if (error) throw error;
      // Increment views
      if (data?.id) {
        await supabase.rpc("increment_demo_views", { p_demo_id: data.id });
      }
      return data;
    },
  });
}

export function useWebsiteScrapes() {
  const { data: orgData } = useOrganization();
  const orgId = (orgData?.organizations as any)?.id;

  return useQuery({
    queryKey: ["website-scrapes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_scrapes")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDemo() {
  const qc = useQueryClient();
  const { data: orgData } = useOrganization();
  const orgId = (orgData?.organizations as any)?.id;

  return useMutation({
    mutationFn: async (values: {
      title?: string;
      demo_html: string;
      demo_type: string;
      company_name?: string;
      contact_id?: string;
      is_public?: boolean;
      public_slug?: string;
      password_hash?: string;
      password_hint?: string;
      model_used?: string;
    }) => {
      const { data, error } = await supabase
        .from("demos")
        .insert({ ...values, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
      toast.success("Demo aangemaakt");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("demos")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
      toast.success("Demo bijgewerkt");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
      toast.success("Demo verwijderd");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDuplicateDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchErr } = await supabase
        .from("demos")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      const { id: _id, created_at, updated_at, public_slug, views, last_viewed_at, ...rest } = original;
      const { data, error } = await supabase
        .from("demos")
        .insert({
          ...rest,
          title: (rest.title || "Demo") + " (kopie)",
          is_public: false,
          public_slug: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
      toast.success("Demo gedupliceerd");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company_name: string;
      website_url?: string;
      demo_type: string;
      contact_id?: string;
      model?: string;
      organization_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("demo-service", {
        body: { action: "generate", ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
      toast.success("Demo gegenereerd");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useEditDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      demo_id: string;
      instruction: string;
      model?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("demo-service", {
        body: { action: "edit", ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
      qc.invalidateQueries({ queryKey: ["demo-versions"] });
      toast.success("Demo bewerkt");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAnalyzeWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      url: string;
      organization_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("demo-service", {
        body: { action: "analyze", ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["website-scrapes"] });
      toast.success("Website analyse gestart");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
