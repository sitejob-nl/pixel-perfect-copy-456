import { Check, CheckCheck, X, Image, Video, FileText, Mic } from "lucide-react";

interface MessageBubbleProps {
  content: string | null;
  direction: string;
  status: string | null;
  message_type: string | null;
  media_url: string | null;
  created_at: string;
  error_message?: string | null;
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
    default: return null;
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
}: MessageBubbleProps) {
  const isOutbound = direction === "outbound";
  const isMedia = message_type && message_type !== "text";

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[75%] rounded-xl px-3 py-2 ${
          isOutbound
            ? "bg-[hsl(142,50%,18%)] text-erp-text0 rounded-br-sm"
            : "bg-erp-bg3 text-erp-text0 rounded-bl-sm"
        }`}
      >
        {isMedia && (
          <div className="flex items-center mb-1">
            <MediaIcon type={message_type!} />
            <span className="text-[11px] text-erp-text2 capitalize">{message_type}</span>
          </div>
        )}

        {media_url && message_type === "image" && (
          <img
            src={media_url}
            alt=""
            className="rounded-lg max-w-full mb-1.5"
            style={{ maxHeight: 200 }}
          />
        )}

        {content && (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        )}

        {error_message && (
          <p className="text-[11px] text-erp-red mt-1">{error_message}</p>
        )}

        <div className={`flex items-center gap-1 mt-0.5 ${isOutbound ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-erp-text3">{formatTime(created_at)}</span>
          {isOutbound && <StatusIcon status={status} />}
        </div>
      </div>
    </div>
  );
}
