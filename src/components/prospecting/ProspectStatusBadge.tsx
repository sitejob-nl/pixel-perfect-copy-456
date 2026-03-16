import type { KanbanStage } from "@/hooks/useProspectKanban";

interface Props {
  status: string;
  stages: KanbanStage[];
}

export default function ProspectStatusBadge({ status, stages }: Props) {
  const stage = stages.find(s => s.status_key === status);
  if (!stage) return <span className="text-[11px] text-erp-text3">{status}</span>;

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap"
      style={{ color: stage.color, background: `${stage.color}18` }}
    >
      {stage.label}
    </span>
  );
}
