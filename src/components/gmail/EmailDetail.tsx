import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { ErpCard, Badge, Chip } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoogleApi } from "@/hooks/useGoogle";
import { useGenerateSuggestions, type ThreadEmail, type EmailThread } from "@/hooks/useGmailThreads";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface Props {
  thread: EmailThread | null;
  emails: ThreadEmail[];
  isLoading: boolean;
  connectionId: string | null;
  onReply: (email: ThreadEmail) => void;
  onCompose: () => void;
}

export default function EmailDetail({ thread, emails, isLoading, connectionId, onReply, onCompose }: Props) {
  const navigate = useNavigate();
  const { callApi } = useGoogleApi();
  const generateSuggestions = useGenerateSuggestions();
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [loadingBodies, setLoadingBodies] = useState<Set<string>>(new Set());
  const [emailBodies, setEmailBodies] = useState<Record<string, string>>({});

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-erp-text3">
        <div className="text-center">
          <Icons.Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[13px]">Selecteer een gesprek</p>
        </div>
      </div>
    );
  }

  const handleExpand = async (email: ThreadEmail) => {
    const id = email.id;
    if (expandedEmails.has(id)) {
      setExpandedEmails(prev => { const s = new Set(prev); s.delete(id); return s; });
      return;
    }
    setExpandedEmails(prev => new Set(prev).add(id));
    if (!emailBodies[id] && connectionId) {
      setLoadingBodies(prev => new Set(prev).add(id));
      try {
        const detail = await callApi(connectionId, "get_message", { message_id: id });
        setEmailBodies(prev => ({ ...prev, [id]: detail.bodyHtml || detail.bodyText || "" }));
      } catch {
        // use snippet as fallback
      } finally {
        setLoadingBodies(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    }
  };

  const handleAnalyze = async (emailId: string) => {
    try {
      await generateSuggestions.mutateAsync(emailId);
      toast.success("AI analyse gestart");
    } catch (err: any) {
      toast.error(err.message || "Analyse mislukt");
    }
  };

  const categoryColors: Record<string, string> = {
    lead: "#ef4444", offerte: "#f59e0b", support: "#eab308",
    project: "#3b82f6", factuur: "#22c55e", overig: "#6b7280",
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Thread header */}
      <div className="px-5 py-4 border-b border-erp-border0 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[16px] font-bold text-erp-text0">{thread.subject}</h2>
          {thread.category && (
            <Badge color={categoryColors[thread.category] || "#6b7280"}>
              {thread.category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {thread.matched_company_name && (
            <Chip>
              <span
                className="cursor-pointer hover:text-erp-blue transition"
                onClick={() => navigate(`/companies/${thread.matched_company_id}`)}
              >
                🏢 {thread.matched_company_name}
              </span>
            </Chip>
          )}
          {thread.matched_project_name && (
            <Chip>
              <span
                className="cursor-pointer hover:text-erp-blue transition"
                onClick={() => navigate(`/projects/${thread.matched_project_id}`)}
              >
                📁 {thread.matched_project_name}
              </span>
            </Chip>
          )}
        </div>
      </div>

      {/* Emails */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full bg-erp-bg3 rounded-lg" />)}
          </div>
        ) : (
          emails.map(email => {
            const isExpanded = expandedEmails.has(email.id);
            const isInbound = email.direction === "inbound";
            return (
              <div key={email.id} className="bg-erp-bg3 rounded-lg border border-erp-border0 overflow-hidden">
                {/* Email header */}
                <div
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-erp-hover transition"
                  onClick={() => handleExpand(email)}
                >
                  <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded", isInbound ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400")}>
                    {isInbound ? "↙" : "↗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-erp-text0 truncate">
                        {email.from_name || email.from_address}
                      </span>
                      <span className="text-[10px] text-erp-text3">→</span>
                      <span className="text-[11px] text-erp-text3 truncate">
                        {email.to_addresses?.join(", ")}
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="text-[11px] text-erp-text3 truncate mt-0.5">{email.snippet}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {email.has_attachments && <span className="text-[10px] text-erp-text3">📎</span>}
                    <span className="text-[10px] text-erp-text3">
                      {format(new Date(email.received_at), "d MMM HH:mm", { locale: nl })}
                    </span>
                    {!email.ai_processed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAnalyze(email.id); }}
                        disabled={generateSuggestions.isPending}
                        className="text-[10px] px-1.5 py-0.5 bg-erp-amber/15 text-erp-amber rounded hover:bg-erp-amber/25 transition"
                      >
                        ✨ Analyseren
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-erp-border0">
                    {loadingBodies.has(email.id) ? (
                      <Skeleton className="h-20 w-full bg-erp-bg4 rounded mt-3" />
                    ) : emailBodies[email.id] ? (
                      <div
                        className="mt-3 text-[12px] text-erp-text1 [&_a]:text-erp-blue [&_img]:max-w-full overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: emailBodies[email.id] }}
                      />
                    ) : (
                      <p className="mt-3 text-[12px] text-erp-text1 whitespace-pre-wrap">
                        {email.body_text || email.snippet}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick actions */}
      <div className="px-5 py-3 border-t border-erp-border0 flex gap-2 flex-shrink-0">
        <button
          onClick={() => emails.length > 0 && onReply(emails[emails.length - 1])}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-blue text-white rounded-lg hover:bg-erp-blue/90 transition"
        >
          ↩ Beantwoorden
        </button>
        <button
          onClick={onCompose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-bg3 border border-erp-border0 rounded-lg text-erp-text1 hover:bg-erp-hover transition"
        >
          ↗ Doorsturen
        </button>
      </div>
    </div>
  );
}
