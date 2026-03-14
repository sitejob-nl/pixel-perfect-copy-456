import { Check, CheckCheck, X, Image, Video, FileText, Mic, MapPin, Bot } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageBubbleProps {
  content: string | null;
  direction: string;
  status: string | null;
  message_type: string | null;
  media_url: string | null;
  created_at: string;
  error_message?: string | null;
  template_name?: string | null;
  metadata?: any;
}

function StatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case "sent":
      return <Check className="w-3.5 h-3.5 text-erp-text3" />;
    case "delivered":
      return <CheckCheck className="w-3.5 h-3.5 text-erp-text3" />;
    case "read":
      return <CheckCheck className="w-3.5 h-3.5" style={{ color: "hsl(200, 80%, 55%)" }} />;
    case "failed":
      return <X className="w-3.5 h-3.5 text-erp-red" />;
    default:
      return null;
  }
}

function MediaIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 text-erp-text2 mr-1.5 flex-shrink-0";
  switch (type) {
    case "image": return <Image className={cls} />;
    case "video": return <Video className={cls} />;
    case "audio": return <Mic className={cls} />;
    case "document": return <FileText className={cls} />;
    case "location": return <MapPin className={cls} />;
    default: return <FileText className={cls} />;
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({
  content,
  direction,
  status,
  message_type,
  media_url,
  created_at,
  error_message,
  template_name,
  metadata,
}: MessageBubbleProps) {
  const isOutbound = direction === "outbound";
  const isMedia = message_type && !["text", "template"].includes(message_type);
  const isTemplate = message_type === "template";
  const isInteractive = message_type === "interactive" || message_type === "interactive_buttons" || message_type === "interactive_list";
  const isReaction = message_type === "reaction";
  const isAutomation = metadata?.automation_id;

  if (isReaction) {
    return (
      <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-1`}>
        <span className="text-lg">{content}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[75%] rounded-xl px-3 py-2 ${
          isOutbound
            ? "bg-[hsl(142,50%,18%)] text-erp-text0 rounded-br-sm"
            : "bg-erp-bg3 text-erp-text0 rounded-bl-sm"
        }`}
      >
        {/* Template label */}
        {isTemplate && template_name && (
          <div className="flex items-center gap-1 mb-1">
            <FileText className="w-3 h-3 text-erp-text3" />
            <span className="text-[10px] text-erp-text3 font-medium">Template: {template_name}</span>
          </div>
        )}

        {/* Automation indicator */}
        {isAutomation && (
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3 text-erp-text3" />
            <span className="text-[10px] text-erp-text3">Automation</span>
          </div>
        )}

        {/* Media type indicator */}
        {isMedia && (
          <div className="flex items-center mb-1">
            <MediaIcon type={message_type!} />
            <span className="text-[11px] text-erp-text2 capitalize">{message_type}</span>
          </div>
        )}

        {/* Image preview */}
        {media_url && message_type === "image" && (
          <img
            src={media_url}
            alt=""
            className="rounded-lg max-w-full mb-1.5"
            style={{ maxHeight: 200 }}
          />
        )}

        {/* Interactive buttons display */}
        {isInteractive && content && (
          <>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
            {metadata?.buttons && (
              <div className="mt-2 space-y-1">
                {(metadata.buttons as Array<{ title: string }>).map((btn, i) => (
                  <div key={i} className="text-[12px] text-center py-1.5 rounded-md border border-erp-border1 text-erp-text2">
                    {btn.title}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Regular text content */}
        {!isInteractive && content && (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        )}

        {/* Error message */}
        {error_message && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-[11px] text-erp-red mt-1 cursor-help truncate max-w-[200px]">⚠ {error_message}</p>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p className="text-xs">{error_message}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Timestamp + status */}
        <div className={`flex items-center gap-1 mt-0.5 ${isOutbound ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-erp-text3">{formatTime(created_at)}</span>
          {isOutbound && <StatusIcon status={status} />}
        </div>
      </div>
    </div>
  );
}
