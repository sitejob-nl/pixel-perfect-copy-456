import { useState } from "react";
import { Search, Plus, MessageSquare, Settings, ArrowLeft } from "lucide-react";
import { Conversation } from "@/hooks/useWhatsApp";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterTab = "alle" | "ongelezen" | "onbeantwoord";

interface Props {
  conversations: Conversation[];
  isLoading: boolean;
  activePhone: string | null;
  onSelect: (phone: string, contactName: string | null, contactId: string | null) => void;
  onNewChat: () => void;
  onSettings: () => void;
  isMobile?: boolean;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nu";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Gisteren";
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function lastMessagePreview(conv: Conversation) {
  const type = conv.last_message_type;
  if (type === "image") return "📷 Afbeelding";
  if (type === "video") return "📹 Video";
  if (type === "audio") return "🎵 Audio";
  if (type === "document") return "📄 Document";
  if (type === "location") return "📍 Locatie";
  if (type === "sticker") return "🏷️ Sticker";
  if (type === "template") return `📝 ${conv.last_message || "Template"}`;
  return conv.last_message || "Media";
}

function statusPrefix(conv: Conversation) {
  if (conv.last_direction !== "outbound") return null;
  switch (conv.last_status) {
    case "sent": return "✓ ";
    case "delivered": return "✓✓ ";
    case "read": return "✓✓ ";
    case "failed": return "✗ ";
    default: return "";
  }
}

export default function ConversationList({ conversations, isLoading, activePhone, onSelect, onNewChat, onSettings, isMobile }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("alle");

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.phone_number.includes(q) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
      (c.company_name && c.company_name.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filter === "ongelezen") return c.unread_count > 0;
    if (filter === "onbeantwoord") return c.last_direction === "inbound";
    return true;
  });

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unansweredTotal = conversations.filter(c => c.last_direction === "inbound").length;

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "alle", label: "Alle" },
    { key: "ongelezen", label: "Ongelezen", count: unreadTotal },
    { key: "onbeantwoord", label: "Onbeantwoord", count: unansweredTotal },
  ];

  return (
    <div className="flex flex-col h-full border-r border-erp-border0 bg-erp-bg1">
      {/* Header */}
      <div className="p-3 border-b border-erp-border0 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-erp-text0">Chats</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onSettings}
              className="w-8 h-8 rounded-lg hover:bg-erp-bg3 flex items-center justify-center text-erp-text2 transition-colors"
              title="Instellingen"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onNewChat}
              className="w-8 h-8 rounded-lg bg-erp-bg3 hover:bg-erp-bg4 flex items-center justify-center text-erp-text1 transition-colors"
              title="Nieuw gesprek"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-erp-text3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam of nummer..."
            className="pl-8 h-8 text-[13px] bg-erp-bg2 border-erp-border0"
          />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                filter === tab.key
                  ? "bg-erp-bg3 text-erp-text0"
                  : "text-erp-text3 hover:text-erp-text1"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-px rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-[13px] text-erp-text3">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-[13px] text-erp-text3">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {filter !== "alle" ? "Geen resultaten voor dit filter" : "Geen conversaties"}
          </div>
        ) : (
          filtered.map((c) => {
            const hue = (c.phone_number.charCodeAt(c.phone_number.length - 1) * 47) % 360;
            return (
              <button
                key={c.phone_number}
                onClick={() => onSelect(c.phone_number, c.contact_name, c.contact_id)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b border-erp-border0 transition-colors hover:bg-erp-bg-hover",
                  activePhone === c.phone_number && "bg-erp-bg3"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[14px]"
                        style={{
                          background: `hsl(${hue}, 35%, 20%)`,
                          color: `hsl(${hue}, 55%, 65%)`,
                        }}
                      >
                        {c.contact_name
                          ? c.contact_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                          : c.phone_number.slice(-2)}
                      </div>
                    )}
                    {c.whatsapp_opt_in && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-erp-bg1" style={{ background: "hsl(142, 70%, 45%)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-[13px] truncate",
                        c.unread_count > 0 ? "font-semibold text-erp-text0" : "font-medium text-erp-text0"
                      )}>
                        {c.contact_name || c.phone_number}
                      </span>
                      <span className={cn(
                        "text-[10px] flex-shrink-0 ml-2",
                        c.unread_count > 0 ? "text-primary font-semibold" : "text-erp-text3"
                      )}>
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    {c.company_name && (
                      <div className="text-[11px] text-erp-text3 truncate">{c.company_name}</div>
                    )}
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={cn(
                        "text-[12px] truncate",
                        c.unread_count > 0 ? "text-erp-text1 font-medium" : "text-erp-text2"
                      )}>
                        {statusPrefix(conv)}
                        {lastMessagePreview(c)}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="flex-shrink-0 ml-2 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
