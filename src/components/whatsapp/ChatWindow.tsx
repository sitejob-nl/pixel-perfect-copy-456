import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare } from "lucide-react";
import { useWhatsAppChatMessages, useWhatsAppSend } from "@/hooks/useWhatsApp";
import { Textarea } from "@/components/ui/textarea";
import MessageBubble from "./MessageBubble";
import { toast } from "sonner";

interface Props {
  phoneNumber: string | null;
  contactName: string | null;
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-erp-border0" />
      <span className="text-[10px] text-erp-text3 font-medium">{date}</span>
      <div className="flex-1 h-px bg-erp-border0" />
    </div>
  );
}

export default function ChatWindow({ phoneNumber, contactName }: Props) {
  const { data: messages, isLoading } = useWhatsAppChatMessages(phoneNumber);
  const sendMsg = useWhatsAppSend();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !phoneNumber) return;
    const msg = text.trim();
    setText("");
    try {
      await sendMsg.mutateAsync({ to: phoneNumber, message: msg, message_type: "text" });
    } catch (err: any) {
      toast.error(err.message || "Bericht versturen mislukt");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!phoneNumber) {
    return (
      <div className="flex-1 flex items-center justify-center bg-erp-bg0">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-erp-text3 opacity-30" />
          <p className="text-[13px] text-erp-text3">Selecteer een conversatie om te beginnen</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  let lastDate = "";

  return (
    <div className="flex-1 flex flex-col bg-erp-bg0 min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-erp-border0 bg-erp-bg1 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-[13px]"
          style={{
            background: `hsl(${(phoneNumber.charCodeAt(phoneNumber.length - 1) * 47) % 360}, 35%, 20%)`,
            color: `hsl(${(phoneNumber.charCodeAt(phoneNumber.length - 1) * 47) % 360}, 55%, 65%)`,
          }}
        >
          {contactName
            ? contactName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
            : phoneNumber.slice(-2)}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-erp-text0">
            {contactName || phoneNumber}
          </p>
          {contactName && (
            <p className="text-[11px] text-erp-text3">{phoneNumber}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="text-[13px] text-erp-text3 text-center py-8">Laden...</div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-[13px] text-erp-text3 text-center py-8">
            Geen berichten. Stuur een bericht om te beginnen.
          </div>
        ) : (
          messages.map((msg) => {
            const msgDate = new Date(msg.created_at).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;

            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={msgDate} />}
                <MessageBubble
                  content={msg.content}
                  direction={msg.direction}
                  status={msg.status}
                  message_type={msg.message_type}
                  media_url={msg.media_url}
                  created_at={msg.created_at}
                  error_message={msg.error_message}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-erp-border0 bg-erp-bg1">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none text-[13px] bg-erp-bg2 border-erp-border0 py-2.5"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMsg.isPending}
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: "hsl(142, 50%, 30%)" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
