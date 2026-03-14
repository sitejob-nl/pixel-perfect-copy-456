import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageSquare, Phone, User, MoreVertical, ArrowLeft, Copy, Link2, AlertTriangle } from "lucide-react";
import { useWhatsAppChatMessages, useWhatsAppSend } from "@/hooks/useWhatsApp";
import { Textarea } from "@/components/ui/textarea";
import MessageBubble from "./MessageBubble";
import ContactLinkSheet from "./ContactLinkSheet";
import ChatToolbar from "./ChatToolbar";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface Props {
  phoneNumber: string | null;
  contactName: string | null;
  contactId: string | null;
  onBack?: () => void;
  isMobile?: boolean;
}

function DateSeparator({ date }: { date: string }) {
  const today = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const label = date === today ? "Vandaag" : date === yesterday ? "Gisteren" : date;
  
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-erp-border0" />
      <span className="text-[10px] text-erp-text3 font-medium bg-erp-bg0 px-2">{label}</span>
      <div className="flex-1 h-px bg-erp-border0" />
    </div>
  );
}

export default function ChatWindow({ phoneNumber, contactName, contactId, onBack, isMobile }: Props) {
  const { data: messages, isLoading } = useWhatsAppChatMessages(phoneNumber);
  const sendMsg = useWhatsAppSend();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !phoneNumber) return;
    const msg = text.trim();
    setText("");
    try {
      await sendMsg.mutateAsync({ to: phoneNumber, message: msg, message_type: "text", contact_id: contactId || undefined });
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

  const copyPhone = () => {
    navigator.clipboard.writeText(phoneNumber || "");
    toast.success("Telefoonnummer gekopieerd");
  };

  if (!phoneNumber) {
    return (
      <div className="flex-1 flex items-center justify-center bg-erp-bg0">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-erp-text3 opacity-30" />
          <p className="text-[14px] font-medium text-erp-text2 mb-1">WhatsApp Business</p>
          <p className="text-[13px] text-erp-text3">Selecteer een conversatie om te beginnen</p>
        </div>
      </div>
    );
  }

  const hue = (phoneNumber.charCodeAt(phoneNumber.length - 1) * 47) % 360;

  // Group messages by date
  let lastDate = "";

  return (
    <div className="flex-1 flex flex-col bg-erp-bg0 min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-erp-border0 bg-erp-bg1 flex items-center gap-3">
        {isMobile && onBack && (
          <button onClick={onBack} className="w-8 h-8 rounded-lg hover:bg-erp-bg3 flex items-center justify-center text-erp-text1">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-[13px]"
          style={{ background: `hsl(${hue}, 35%, 20%)`, color: `hsl(${hue}, 55%, 65%)` }}
        >
          {contactName
            ? contactName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
            : phoneNumber.slice(-2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-erp-text0 truncate">
            {contactName || phoneNumber}
          </p>
          {contactName && (
            <p className="text-[11px] text-erp-text3">{phoneNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyPhone} className="w-8 h-8 rounded-lg hover:bg-erp-bg3 flex items-center justify-center text-erp-text2 transition-colors" title="Kopieer nummer">
            <Phone className="w-4 h-4" />
          </button>
          {contactId && (
            <button onClick={() => navigate(`/contacts/${contactId}`)} className="w-8 h-8 rounded-lg hover:bg-erp-bg3 flex items-center justify-center text-erp-text2 transition-colors" title="Contact bekijken">
              <User className="w-4 h-4" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-lg hover:bg-erp-bg3 flex items-center justify-center text-erp-text2 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-erp-bg2 border-erp-border0">
              {!contactId && (
                <DropdownMenuItem onClick={() => setLinkSheetOpen(true)} className="text-[13px]">
                  <Link2 className="w-4 h-4 mr-2" /> Contact koppelen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={copyPhone} className="text-[13px]">
                <Copy className="w-4 h-4 mr-2" /> Nummer kopiëren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contact linking banner */}
      {!contactId && (
        <div className="px-4 py-2 bg-erp-amber/10 border-b border-erp-amber/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--erp-amber))" }} />
          <span className="text-[12px] text-erp-text1 flex-1">
            Dit nummer is niet gekoppeld aan een contact.
          </span>
          <button
            onClick={() => setLinkSheetOpen(true)}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Koppelen
          </button>
        </div>
      )}

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
                  template_name={msg.template_name}
                  metadata={msg.metadata}
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

      {/* Contact link sheet */}
      <ContactLinkSheet
        open={linkSheetOpen}
        onOpenChange={setLinkSheetOpen}
        phoneNumber={phoneNumber}
      />
    </div>
  );
}
