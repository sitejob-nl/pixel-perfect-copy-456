import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function callProspectEngine(action: string, params: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Niet ingelogd");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/prospect-engine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Onbekende fout" }));
    throw new Error(err.error || `Fout ${res.status}`);
  }
  return res.json();
}

export function useProspectingStatus() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["prospecting-status", orgId],
    enabled: !!orgId,
    queryFn: () => callProspectEngine("status", { organization_id: orgId }),
    refetchInterval: 30000,
  });
}

export function useProspectPool(poolId: string | undefined) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  const query = useQuery({
    queryKey: ["prospect-pool", poolId, orgId],
    enabled: !!orgId && !!poolId,
    queryFn: () => callProspectEngine("status", { organization_id: orgId, pool_id: poolId }),
  });

  // Poll when there are active jobs
  const hasActiveJobs = query.data?.leads?.some(
    (l: any) => ["analyzing", "demo_building", "demo_queued"].includes(l.status)
  );

  return useQuery({
    queryKey: ["prospect-pool", poolId, orgId],
    enabled: !!orgId && !!poolId,
    queryFn: () => callProspectEngine("status", { organization_id: orgId, pool_id: poolId }),
    refetchInterval: hasActiveJobs ? 5000 : false,
  });
}

export function useProspectSearch() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { source: string; query?: string; config?: any; leads?: any[] }) =>
      callProspectEngine("search", { organization_id: orgId, ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospecting-status"] });
    },
  });
}

export function useProspectAction() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { action: string; lead_ids?: string[]; pool_id?: string; [key: string]: any }) => {
      const { action, ...rest } = params;
      return callProspectEngine(action, { organization_id: orgId, ...rest });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-pool"] });
      qc.invalidateQueries({ queryKey: ["prospecting-status"] });
    },
  });
}
