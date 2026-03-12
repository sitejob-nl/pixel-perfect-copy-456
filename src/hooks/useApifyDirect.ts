import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export function useApifyActors() {
  return useQuery({
    queryKey: ["apify-actors"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("apify-direct", {
        body: { action: "list_actors" },
      });
      if (res.error) throw res.error;
      return res.data.actors as any[];
    },
  });
}

export function useApifyActor(actorId: string | null) {
  return useQuery({
    queryKey: ["apify-actor", actorId],
    enabled: !!actorId,
    queryFn: async () => {
      const res = await supabase.functions.invoke("apify-direct", {
        body: { action: "get_actor", actor_id: actorId },
      });
      if (res.error) throw res.error;
      return res.data as any;
    },
  });
}

export function useStartApifyRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ actorId, input }: { actorId: string; input: Record<string, any> }) => {
      const res = await supabase.functions.invoke("apify-direct", {
        body: { action: "start_run", actor_id: actorId, input },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as { run_id: string; apify_run_id: string; status: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apify-runs"] }),
  });
}

export function useCheckRunStatus() {
  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await supabase.functions.invoke("apify-direct", {
        body: { action: "check_status", run_id: runId },
      });
      if (res.error) throw res.error;
      return res.data;
    },
  });
}

export function useGetRunResults() {
  return useMutation({
    mutationFn: async ({ runId, limit, offset }: { runId: string; limit?: number; offset?: number }) => {
      const res = await supabase.functions.invoke("apify-direct", {
        body: { action: "get_results", run_id: runId, limit, offset },
      });
      if (res.error) throw res.error;
      return res.data;
    },
  });
}

export function useSaveToCRM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, source, temperature }: { runId: string; source?: string; temperature?: string }) => {
      const res = await supabase.functions.invoke("apify-direct", {
        body: { action: "save_to_crm", run_id: runId, source, temperature },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["apify-runs"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useApifyRuns() {
  return useQuery({
    queryKey: ["apify-runs"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("apify-direct", {
        body: { action: "list_runs" },
      });
      if (res.error) throw res.error;
      return res.data.runs as any[];
    },
  });
}

export function useApifyRunPoller(runId: string | null) {
  const checkStatus = useCheckRunStatus();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!runId) { setStatus(null); return; }
    let active = true;
    const poll = async () => {
      while (active) {
        try {
          const result = await checkStatus.mutateAsync(runId);
          if (!active) break;
          setStatus(result);
          if (["succeeded", "failed", "aborted"].includes(result.status)) break;
        } catch {
          break;
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    };
    poll();
    return () => { active = false; };
  }, [runId]);

  return status;
}
