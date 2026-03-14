import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader, ErpCard, ErpButton, ErpTabs, Badge, Dot, Chip, TH, TD, TR, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CreateActivityDialog from "@/components/erp/CreateActivityDialog";
import { projStatus } from "@/data/mockData";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [activityOpen, setActivityOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, companies(name, industry, city)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["project-timeline", id],
    enabled: !!id && tab === "timeline",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_project_timeline" as any)
        .select("*")
        .eq("project_id", id!)
        .order("event_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["project-checklist", id],
    enabled: !!id && tab === "checklist",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_checklist_items")
        .select("*")
        .eq("project_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("project_checklist_items")
        .update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-checklist", id] }),
  });

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("project_checklist_items")
        .insert({
          project_id: id!,
          organization_id: orgId!,
          title,
          sort_order: checklist.length + 1,
          is_required: false,
          is_completed: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-checklist", id] });
      setNewItem("");
      toast.success("Item toegevoegd");
    },
  });

  if (isLoading) return <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>;
  if (!project) return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Project niet gevonden</ErpCard>;

  const [statusLabel, statusColor] = projStatus[project.status] || ["?", "#6b7280"];
  const completedCount = checklist.filter((c: any) => c.is_completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const sourceIcon = (source: string) => {
    switch (source) {
      case "activity": return "📝"; case "status_update": return "📢"; case "invoice": return "💰";
      case "checklist": return "✓"; case "contract": return "📄"; default: return "⚡";
    }
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate("/projects")} className="text-erp-text3 hover:text-erp-text1 transition-colors">
          <Icons.ChevDown className="w-4 h-4 rotate-90" />
        </button>
        <span className="text-erp-text3 text-xs">Projecten</span>
      </div>

      <PageHeader title={project.name} desc={project.project_number}>
        <ErpButton onClick={() => setActivityOpen(true)}>
          <Icons.Plus className="w-4 h-4" /> Activiteit
        </ErpButton>
      </PageHeader>

      <div className="flex items-center gap-3 mb-5">
        <Badge color={statusColor}><Dot color={statusColor} size={5} />{statusLabel}</Badge>
        {project.priority && <Chip>{project.priority}</Chip>}
        {project.companies?.name && <Chip>{project.companies.name}</Chip>}
      </div>

      <ErpTabs
        items={[["overview", "Overzicht"], ["timeline", "Timeline"], ["checklist", "Checklist"]]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div className="space-y-5">
          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-4">Details</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Geschatte waarde", project.estimated_value ? `€${fmt(project.estimated_value)}` : "—"],
                ["Werkelijke waarde", project.actual_value ? `€${fmt(project.actual_value)}` : "—"],
                ["MRR", project.monthly_amount ? `€${fmt(project.monthly_amount)}` : "—"],
                ["Facturatie", project.billing_frequency ?? "—"],
                ["Contract start", project.contract_start ? format(new Date(project.contract_start), "d MMM yyyy") : "—"],
                ["Contract einde", project.contract_end ? format(new Date(project.contract_end), "d MMM yyyy") : "—"],
                ["Opzegtermijn", project.notice_period_days ? `${project.notice_period_days} dagen` : "—"],
                ["SLA", project.sla_level ?? "—"],
                ["Toegewezen aan", project.assigned_to ?? "—"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="text-[11px] text-erp-text3 mb-1">{label}</div>
                  <div className="text-[13px] text-erp-text0">{value}</div>
                </div>
              ))}
              {project.preview_url && (
                <div>
                  <div className="text-[11px] text-erp-text3 mb-1">Preview URL</div>
                  <a href={project.preview_url} target="_blank" rel="noopener" className="text-[13px] text-erp-blue hover:underline truncate block">
                    {project.preview_url.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>
          </ErpCard>

          {project.notes && (
            <ErpCard className="p-5">
              <div className="text-[14px] font-semibold mb-2">Notities</div>
              <div className="text-[13px] text-erp-text1 whitespace-pre-wrap">{project.notes}</div>
            </ErpCard>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <ErpCard className="p-5">
          {timeline.length === 0 && <div className="text-sm text-erp-text3 py-4">Geen events gevonden</div>}
          <div className="space-y-0">
            {timeline.map((ev: any, i: number) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-base w-7 h-7 flex items-center justify-center">{sourceIcon(ev.source)}</span>
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-erp-border0 my-1" />}
                </div>
                <div className="pb-5 flex-1 min-w-0">
                  <div className="text-[13px] text-erp-text0 font-medium">{ev.title}</div>
                  {ev.description && <div className="text-[12px] text-erp-text2 mt-0.5 truncate">{ev.description}</div>}
                  <div className="text-[11px] text-erp-text3 mt-1">
                    {formatDistanceToNow(new Date(ev.event_at), { addSuffix: true, locale: nl })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ErpCard>
      )}

      {tab === "checklist" && (
        <div className="space-y-4">
          {/* Progress */}
          <ErpCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-erp-text2">{completedCount}/{totalCount} afgerond</span>
              <span className="text-xs font-semibold text-erp-text0">{progress}%</span>
            </div>
            <div className="h-[6px] bg-erp-bg4 rounded-sm overflow-hidden">
              <div className="h-full rounded-sm bg-erp-green transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </ErpCard>

          <ErpCard className="p-4">
            {checklist.length === 0 && <div className="text-sm text-erp-text3 py-4">Geen checklist items</div>}
            {checklist.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-erp-border0 last:border-none">
                <input
                  type="checkbox"
                  checked={item.is_completed}
                  onChange={() => toggleItem.mutate({ itemId: item.id, completed: !item.is_completed })}
                  className="w-4 h-4 rounded border-erp-border1 accent-erp-blue cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] ${item.is_completed ? "text-erp-text3 line-through" : "text-erp-text0"}`}>
                    {item.title}
                  </span>
                </div>
                {item.is_required && <Badge color="#f59e0b">Verplicht</Badge>}
                {item.due_date && (
                  <span className="text-[11px] text-erp-text3">{format(new Date(item.due_date), "d MMM")}</span>
                )}
              </div>
            ))}

            <form
              onSubmit={e => { e.preventDefault(); if (newItem.trim()) addItem.mutate(newItem.trim()); }}
              className="flex gap-2 mt-3 pt-3 border-t border-erp-border0"
            >
              <Input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                placeholder="Nieuw item toevoegen..."
                className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm flex-1"
              />
              <ErpButton primary disabled={!newItem.trim()}>
                <Icons.Plus className="w-3.5 h-3.5" />
              </ErpButton>
            </form>
          </ErpCard>
        </div>
      )}

      <CreateActivityDialog open={activityOpen} onOpenChange={setActivityOpen} defaultProjectId={id} />
    </div>
  );
}
