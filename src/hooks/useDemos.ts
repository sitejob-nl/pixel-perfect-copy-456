import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Helper for calling demo-service edge function
export async function callDemoService(action: string, params: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/demo-service`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || "Edge function error");
  }
  return res.json();
}

// ── Polling hook (reusable) ─────────────────────────────────────
export function usePollStatus(action: string, params: any, interval = 3000, enabled = false) {
  return useQuery({
    queryKey: ["poll", action, JSON.stringify(params)],
    queryFn: () => callDemoService(action, params),
    refetchInterval: enabled ? interval : false,
    enabled,
  });
}

// ── Demo list ───────────────────────────────────────────────────
export function useDemos() {
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

// ── Single demo ─────────────────────────────────────────────────
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

// ── Demo pages (multi-page) ─────────────────────────────────────
export function useDemoPages(demoId: string | undefined) {
  return useQuery({
    queryKey: ["demo-pages", demoId],
    enabled: !!demoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_pages")
        .select("*")
        .eq("demo_id", demoId!)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ── Demo versions ───────────────────────────────────────────────
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

// ── Public demo (no auth) ───────────────────────────────────────
export function usePublicDemo(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-demo", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demos")
        .select("id, title, company_name, public_slug, branding, share_settings, is_public, password_hash, demo_html")
        .eq("public_slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// ── Public demo pages ───────────────────────────────────────────
export function usePublicDemoPages(demoId: string | undefined) {
  return useQuery({
    queryKey: ["public-demo-pages", demoId],
    enabled: !!demoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_pages")
        .select("slug, title, html_content, sort_order")
        .eq("demo_id", demoId!)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ── Website scrapes ─────────────────────────────────────────────
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

// ── CRUD mutations ──────────────────────────────────────────────
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
        .insert({ ...rest, title: (rest.title || "Demo") + " (kopie)", is_public: false, public_slug: null })
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

// ── Edge function mutations ─────────────────────────────────────
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
      scrape_id?: string;
      pages?: { title: string; slug: string; description: string }[];
      extra_instructions?: string;
      branding?: any;
    }) => {
      return callDemoService("generate", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
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
      page_slug?: string;
    }) => {
      return callDemoService("edit", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demos"] });
      qc.invalidateQueries({ queryKey: ["demo-versions"] });
      qc.invalidateQueries({ queryKey: ["demo-pages"] });
      toast.success("Demo bewerkt");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAnalyzeWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { url: string; organization_id: string }) => {
      return callDemoService("analyze", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["website-scrapes"] });
      toast.success("Website analyse gestart");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Crawl mutations ─────────────────────────────────────────────
export function useCrawlStart() {
  return useMutation({
    mutationFn: async (payload: { url: string; organization_id: string; page_limit?: number; depth?: number }) => {
      return callDemoService("crawl-start", payload);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCrawlAnalyze() {
  return useMutation({
    mutationFn: async (payload: { crawl_job_id: string }) => {
      return callDemoService("crawl-analyze", payload);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Feedback ────────────────────────────────────────────────────
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (payload: {
      demo_id: string;
      page_slug?: string;
      feedback_type: string;
      name?: string;
      email?: string;
      message?: string;
    }) => {
      return callDemoService("feedback", payload);
    },
    onSuccess: () => toast.success("Bedankt voor je feedback!"),
    onError: (e: any) => toast.error(e.message),
  });
}
