import { useState } from "react";
import { useWhatsAppConversations, useWhatsAppAccount } from "@/hooks/useWhatsApp";
import ConversationList from "@/components/whatsapp/ConversationList";
import ChatWindow from "@/components/whatsapp/ChatWindow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";

export default function WhatsAppPage() {
  const { data: account } = useWhatsAppAccount();
  const { data: conversations = [], isLoading } = useWhatsAppConversations();
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");

  const isConnected = account?.is_active && account?.phone_number_id !== "pending";

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm space-y-3">
          <MessageSquare className="w-12 h-12 mx-auto text-erp-text3 opacity-30" />
          <h2 className="text-[15px] font-semibold text-erp-text0">WhatsApp niet gekoppeld</h2>
          <p className="text-[13px] text-erp-text3">
            Ga naar Instellingen → WhatsApp om je WhatsApp Business account te koppelen.
          </p>
        </div>
      </div>
    );
  }

  const handleSelect = (phone: string, name: string | null) => {
    setActivePhone(phone);
    setActiveName(name);
  };

  const handleNewChat = () => setNewChatOpen(true);

  const startNewChat = () => {
    if (!newPhone.trim()) return;
    const phone = newPhone.trim().replace(/\s/g, "");
    setActivePhone(phone);
    setActiveName(null);
    setNewPhone("");
    setNewChatOpen(false);
  };

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
        />
      </div>

      {/* Chat area */}
      <ChatWindow phoneNumber={activePhone} contactName={activeName} />

      {/* New chat dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-erp-text0 text-[15px]">Nieuw gesprek</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+31612345678"
              className="bg-erp-bg3 border-erp-border0 text-[13px]"
              onKeyDown={(e) => e.key === "Enter" && startNewChat()}
            />
            <p className="text-[11px] text-erp-text3">
              Voer het telefoonnummer in met landcode (bijv. +31612345678)
            </p>
            <button
              onClick={startNewChat}
              disabled={!newPhone.trim()}
              className="w-full h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-colors"
              style={{ background: "hsl(142, 50%, 30%)" }}
            >
              Start gesprek
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
