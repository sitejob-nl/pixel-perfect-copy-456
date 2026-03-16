import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProspectLead } from "@/hooks/useProspectKanban";
import { ExternalLink, Eye, Linkedin, Mail, Phone, Send, Layout, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function ScoreBadge({ score }: { score: number }) {
  const bg = score >= 61 ? "bg-green-500/15 text-green-500" : score >= 41 ? "bg-yellow-500/15 text-yellow-500" : "bg-red-500/15 text-red-500";
  return <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded", bg)}>{score}</span>;
}

const channelIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="w-3 h-3" />,
  whatsapp: <MessageCircle className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  phone: <Phone className="w-3 h-3" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}u`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

interface Props {
  lead: ProspectLead;
  onClick: () => void;
}

export default function ProspectCard({ lead, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-erp-bg2 border border-erp-border0 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-erp-border1 transition-colors",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      {/* Company name */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[13px] font-semibold text-erp-text0 truncate">{lead.company_name}</span>
        {lead.score != null && lead.score > 0 && <ScoreBadge score={lead.score} />}
      </div>

      {/* City */}
      {lead.city && (
        <div className="text-[11px] text-erp-text3 mb-1.5">{lead.city}</div>
      )}

      {/* Google rating */}
      {lead.google_rating != null && (
        <div className="text-[11px] text-erp-text2 mb-1.5">
          ⭐ {lead.google_rating}{lead.google_review_count != null && ` (${lead.google_review_count})`}
        </div>
      )}

      {/* Contact */}
      {lead.contact_name && (
        <div className="flex items-center gap-1.5 text-[11px] text-erp-text2 mb-1.5">
          <span className="truncate">{lead.contact_name}</span>
          {lead.contact_linkedin_url && (
            <a
              href={lead.contact_linkedin_url}
              target="_blank"
              rel="noopener"
              onClick={e => e.stopPropagation()}
              className="text-[#0A66C2] hover:opacity-80 flex-shrink-0"
            >
              <Linkedin className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Demo status */}
      <div className="flex items-center gap-2 flex-wrap">
        {lead.demo_url && !lead.email_sent_at && !lead.demo_viewed_at && (
          <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
            <Layout className="w-3 h-3" /> Demo klaar
          </span>
        )}
        {lead.email_sent_at && !lead.demo_viewed_at && (
          <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
            <Send className="w-3 h-3" /> Verstuurd
          </span>
        )}
        {lead.demo_viewed_at && (
          <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
            <Eye className="w-3 h-3" /> {lead.demo_view_count || 1}x bekeken
          </span>
        )}
      </div>

      {/* Last contact */}
      {lead.last_contacted_at && (
        <div className="flex items-center gap-1 text-[10px] text-erp-text3 mt-1.5">
          {lead.last_contact_channel && channelIcons[lead.last_contact_channel]}
          <span>{timeAgo(lead.last_contacted_at)} geleden</span>
        </div>
      )}
    </div>
  );
}
