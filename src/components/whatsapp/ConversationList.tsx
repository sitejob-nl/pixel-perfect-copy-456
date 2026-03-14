import { useState } from "react";
import { Search, Plus, MessageSquare } from "lucide-react";
import { Conversation } from "@/hooks/useWhatsApp";
import { Input } from "@/components/ui/input";

interface Props {
  conversations: Conversation[];
  isLoading: boolean;
  activePhone: string | null;
  onSelect: (phone: string, contactName: string | null) => void;
  onNewChat: () => void;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nu";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}u`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default function ConversationList({ conversations, isLoading, activePhone, onSelect, onNewChat }: Props) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.phone_number.includes(q) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full border-r border-erp-border0 bg-erp-bg1">
      {/* Header */}
      <div className="p-3 border-b border-erp-border0 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-erp-text0">Chats</h2>
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-lg bg-erp-bg3 hover:bg-erp-bg4 flex items-center justify-center text-erp-text1 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
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
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-[13px] text-erp-text3">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-[13px] text-erp-text3">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Geen conversaties
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.phone_number}
              onClick={() => onSelect(c.phone_number, c.contact_name)}
              className={`w-full text-left px-3 py-3 border-b border-erp-border0 transition-colors hover:bg-erp-bg-hover ${
                activePhone === c.phone_number ? "bg-erp-bg3" : ""
              }`}
            >
              {/* Avatar circle */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-[14px]"
                  style={{
                    background: `hsl(${(c.phone_number.charCodeAt(c.phone_number.length - 1) * 47) % 360}, 35%, 20%)`,
                    color: `hsl(${(c.phone_number.charCodeAt(c.phone_number.length - 1) * 47) % 360}, 55%, 65%)`,
                  }}
                >
                  {c.contact_name
                    ? c.contact_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                    : c.phone_number.slice(-2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-erp-text0 truncate">
                      {c.contact_name || c.phone_number}
                    </span>
                    <span className="text-[10px] text-erp-text3 flex-shrink-0 ml-2">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {c.last_direction === "outbound" && (
                      <span className="text-[11px] text-erp-text3">→</span>
                    )}
                    <span className="text-[12px] text-erp-text2 truncate">
                      {c.last_message || "Media"}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
