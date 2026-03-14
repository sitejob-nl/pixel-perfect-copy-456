import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Phone, User, MoreVertical, ArrowLeft, Copy, Link2, AlertTriangle, FileText } from "lucide-react";
import { useWhatsAppChatMessages, useWhatsAppSend } from "@/hooks/useWhatsApp";
import { Textarea } from "@/components/ui/textarea";
import MessageBubble from "./MessageBubble";
import ContactLinkSheet from "./ContactLinkSheet";
import ChatToolbar, { TemplateSheet } from "./ChatToolbar";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark unread inbound messages as read when opening chat
  useEffect(() => {
    if (!messages || !phoneNumber) return;
    const unreadInbound = messages.filter(m => m.direction === "inbound" && m.whatsapp_msg_id && m.status !== "read");
    if (unreadInbound.length === 0) return;

    // Mark the latest inbound message as read via Meta API
    const latestInbound = unreadInbound[unreadInbound.length - 1];
    if (latestInbound?.whatsapp_msg_id) {
      supabase.functions.invoke("whatsapp-mark-read", {
        body: { message_id: latestInbound.whatsapp_msg_id },
      }).catch(() => {
        // Non-critical, ignore errors
      });
    }
  }, [messages, phoneNumber]);

  useEffect(() => {
    const handler = (e: Event) => {
      const emoji = (e as CustomEvent).detail;
      setText(prev => prev + emoji);
      textareaRef.current?.focus();
    };
    window.addEventListener("wa-insert-emoji", handler);
    return () => window.removeEventListener("wa-insert-emoji", handler);
  }, []);

  // Determine if this is a new conversation (no messages yet or no outbound messages)
  const hasOutboundMessage = messages && messages.some(m => m.direction === "outbound");
  const isNewConversation = !isLoading && (!messages || messages.length === 0 || !hasOutboundMessage);

  // Check if last inbound message is within 24h (customer service window)
  const hasActiveWindow = (() => {
    if (!messages || messages.length === 0) return false;
    const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
    if (!lastInbound) return false;
    const diff = Date.now() - new Date(lastInbound.created_at).getTime();
    return diff < 24 * 60 * 60 * 1000;
  })();

  const requiresTemplate = isNewConversation && !hasActiveWindow;

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
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
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
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-erp-text3 opacity-20" />
            <p className="text-[13px] text-erp-text2 mb-1">Nieuw gesprek</p>
            <p className="text-[11px] text-erp-text3 mb-4">
              Stuur eerst een template bericht om het gesprek te starten.
            </p>
            <button
              onClick={() => setTemplateSheetOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-medium text-white bg-primary"
            >
              <FileText className="w-4 h-4" /> Template kiezen
            </button>
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

      {/* Input area */}
      <div className="border-t border-erp-border0 bg-erp-bg1">
        {requiresTemplate ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[12px] text-erp-text2">
                Je kunt alleen een template bericht sturen buiten het 24-uurs servicevenster.
              </p>
            </div>
            <button
              onClick={() => setTemplateSheetOpen(true)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium text-white bg-primary flex-shrink-0"
            >
              <FileText className="w-3.5 h-3.5" /> Template sturen
            </button>
          </div>
        ) : (
          <>
            <div className="px-2 py-1 border-b border-erp-border0">
              <ChatToolbar phoneNumber={phoneNumber} contactId={contactId} />
            </div>
            <div className="px-4 py-2 flex items-end gap-2">
              <Textarea
                ref={textareaRef}
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
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 bg-primary"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Template sheet for new conversations */}
      <TemplateSheet
        open={templateSheetOpen}
        onOpenChange={setTemplateSheetOpen}
        phone={phoneNumber}
        contactId={contactId}
      />

      {/* Contact link sheet */}
      <ContactLinkSheet
        open={linkSheetOpen}
        onOpenChange={setLinkSheetOpen}
        phoneNumber={phoneNumber}
      />
    </div>
  );
}
