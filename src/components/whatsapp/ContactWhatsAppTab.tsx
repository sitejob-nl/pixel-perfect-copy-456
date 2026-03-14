import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, AlertTriangle } from "lucide-react";
import { useWhatsAppContactMessages, useWhatsAppSend, useWhatsAppAccount } from "@/hooks/useWhatsApp";
import { Textarea } from "@/components/ui/textarea";
import MessageBubble from "./MessageBubble";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  contactId: string;
  contactPhone: string | null;
  contactMobile: string | null;
  whatsappOptIn: boolean;
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("06")) cleaned = "316" + cleaned.slice(2);
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  return cleaned;
}

function DateSeparator({ date }: { date: string }) {
  const today = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const label = date === today ? "Vandaag" : date === yesterday ? "Gisteren" : date;
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-erp-border0" />
      <span className="text-[10px] text-erp-text3 font-medium">{label}</span>
      <div className="flex-1 h-px bg-erp-border0" />
    </div>
  );
}

export default function ContactWhatsAppTab({ contactId, contactPhone, contactMobile, whatsappOptIn }: Props) {
  const { data: account } = useWhatsAppAccount();
  const phone = contactMobile || contactPhone;
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const { data: messages, isLoading } = useWhatsAppContactMessages(contactId);
  const sendMsg = useWhatsAppSend();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const isConnected = account?.is_active && account?.phone_number_id !== "pending";

  const updateOptIn = useMutation({
    mutationFn: async (optIn: boolean) => {
      const { error } = await supabase
        .from("contacts")
        .update({ whatsapp_opt_in: optIn })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      toast.success("Opt-in status bijgewerkt");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !normalizedPhone) return;
    const msg = text.trim();
    setText("");
    try {
      await sendMsg.mutateAsync({ to: normalizedPhone, message: msg, message_type: "text", contact_id: contactId });
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

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-erp-text3 opacity-30" />
        <p className="text-[13px] text-erp-text3">WhatsApp is niet verbonden.</p>
        <p className="text-[12px] text-erp-text3 mt-1">Ga naar Instellingen → WhatsApp om te verbinden.</p>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-erp-text3 opacity-30" />
        <p className="text-[13px] text-erp-text3">Geen telefoonnummer beschikbaar</p>
        <p className="text-[12px] text-erp-text3 mt-1">Voeg een mobiel nummer toe om via WhatsApp te communiceren.</p>
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="flex flex-col h-[500px]">
      {/* Opt-in warning */}
      {!whatsappOptIn && (
        <div className="px-3 py-2 bg-erp-amber/10 border-b border-erp-amber/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--erp-amber))" }} />
          <span className="text-[11px] text-erp-text1 flex-1">
            Dit contact heeft geen WhatsApp opt-in. Stuur alleen berichten als je toestemming hebt.
          </span>
          <button
            onClick={() => updateOptIn.mutate(true)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Opt-in
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="text-[13px] text-erp-text3 text-center py-8">Laden...</div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-erp-text3 opacity-30" />
            <p className="text-[13px] text-erp-text3">Nog geen WhatsApp berichten met dit contact</p>
            <p className="text-[12px] text-erp-text3 mt-1">Stuur een bericht om te beginnen</p>
          </div>
        ) : (
          messages.map((msg) => {
            const msgDate = new Date(msg.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
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
      <div className="px-3 py-2 border-t border-erp-border0">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht..."
            className="flex-1 min-h-[36px] max-h-[100px] resize-none text-[13px] bg-erp-bg3 border-erp-border0 py-2"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMsg.isPending}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: "hsl(142, 50%, 30%)" }}
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
