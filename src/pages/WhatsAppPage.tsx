import { useState } from "react";
import { useWhatsAppConversations, useWhatsAppAccount, useWhatsAppRealtime } from "@/hooks/useWhatsApp";
import ConversationList from "@/components/whatsapp/ConversationList";
import ChatWindow from "@/components/whatsapp/ChatWindow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export default function WhatsAppPage() {
  const { data: account } = useWhatsAppAccount();
  const { data: conversations = [], isLoading } = useWhatsAppConversations();
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Enable realtime subscriptions
  useWhatsAppRealtime();

  const isConnected = account?.is_active && account?.phone_number_id !== "pending";

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "hsl(142, 50%, 18%)" }}>
            <MessageSquare className="w-8 h-8" style={{ color: "hsl(142, 70%, 45%)" }} />
          </div>
          <h2 className="text-[16px] font-semibold text-erp-text0">WhatsApp niet gekoppeld</h2>
          <p className="text-[13px] text-erp-text3">
            Verbind je WhatsApp Business account om berichten te versturen en ontvangen vanuit het CRM.
          </p>
          <button
            onClick={() => navigate("/settings")}
            className="h-9 px-4 rounded-lg text-[13px] font-medium text-white transition-colors"
            style={{ background: "hsl(142, 50%, 30%)" }}
          >
            WhatsApp verbinden
          </button>
        </div>
      </div>
    );
  }

  const handleSelect = (phone: string, name: string | null, contactId: string | null) => {
    setActivePhone(phone);
    setActiveName(name);
    setActiveContactId(contactId);
  };

  const handleBack = () => {
    setActivePhone(null);
    setActiveName(null);
    setActiveContactId(null);
  };

  const handleNewChat = () => setNewChatOpen(true);

  const startNewChat = () => {
    if (!newPhone.trim()) return;
    const phone = newPhone.trim().replace(/\s/g, "");
    setActivePhone(phone);
    setActiveName(null);
    setActiveContactId(null);
    setNewPhone("");
    setNewChatOpen(false);
  };

  // Mobile: show either list or chat
  if (isMobile) {
    return (
      <div className="flex h-[calc(100vh-48px)] bg-erp-bg0">
        {activePhone ? (
          <ChatWindow
            phoneNumber={activePhone}
            contactName={activeName}
            contactId={activeContactId}
            onBack={handleBack}
            isMobile
          />
        ) : (
          <div className="w-full">
            <ConversationList
              conversations={conversations}
              isLoading={isLoading}
              activePhone={activePhone}
              onSelect={handleSelect}
              onNewChat={handleNewChat}
              onSettings={() => navigate("/settings")}
              isMobile
            />
          </div>
        )}
        <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} phone={newPhone} setPhone={setNewPhone} onStart={startNewChat} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-48px)] bg-erp-bg0">
      {/* Conversation sidebar */}
      <div className="w-[340px] flex-shrink-0">
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          activePhone={activePhone}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onSettings={() => navigate("/settings")}
        />
      </div>

      {/* Chat area */}
      <ChatWindow
        phoneNumber={activePhone}
        contactName={activeName}
        contactId={activeContactId}
      />

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} phone={newPhone} setPhone={setNewPhone} onStart={startNewChat} />
    </div>
  );
}

function NewChatDialog({ open, onOpenChange, phone, setPhone, onStart }: {
  open: boolean; onOpenChange: (v: boolean) => void; phone: string; setPhone: (v: string) => void; onStart: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-erp-text0 text-[15px]">Nieuw gesprek</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+31612345678"
            className="bg-erp-bg3 border-erp-border0 text-[13px]"
            onKeyDown={(e) => e.key === "Enter" && onStart()}
          />
          <p className="text-[11px] text-erp-text3">
            Voer het telefoonnummer in met landcode (bijv. +31612345678)
          </p>
          <button
            onClick={onStart}
            disabled={!phone.trim()}
            className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-colors"
            style={{ background: "hsl(142, 50%, 30%)" }}
          >
            Start gesprek
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
