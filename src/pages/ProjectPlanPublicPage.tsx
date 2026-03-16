import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PlanPreview from "@/components/project-plans/PlanPreview";

export default function ProjectPlanPublicPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ["public_plan", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_plans")
        .select("*, project_plan_sections(*)")
        .eq("public_slug", slug!)
        .single();
      if (error) throw error;
      // Sort sections
      (data as any).project_plan_sections.sort((a: any, b: any) => a.sort_order - b.sort_order);
      return data as any;
    },
  });

  // Track view
  useEffect(() => {
    if (!plan) return;
    supabase
      .from("project_plans")
      .update({ view_count: (plan.view_count || 0) + 1, viewed_at: new Date().toISOString() })
      .eq("id", plan.id)
      .then();
  }, [plan?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Laden...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Projectplan niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-[800px] mx-auto">
        <PlanPreview plan={plan} sections={plan.project_plan_sections} />
      </div>
    </div>
  );
}
