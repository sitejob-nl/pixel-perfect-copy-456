import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Icons } from "@/components/erp/ErpIcons";
import { Avatar } from "@/components/erp/ErpPrimitives";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { EmailThread } from "@/hooks/useGmailThreads";

const categories = [
  { key: "alle", label: "Alle", icon: "" },
  { key: "lead", label: "🔥 Leads", color: "#ef4444" },
  { key: "offerte", label: "💰 Offertes", color: "#f59e0b" },
  { key: "support", label: "🛠 Support", color: "#eab308" },
  { key: "project", label: "📋 Project", color: "#3b82f6" },
  { key: "factuur", label: "💳 Facturen", color: "#22c55e" },
  { key: "overig", label: "📧 Overig", color: "#6b7280" },
];

const categoryColors: Record<string, string> = {
  lead: "bg-red-500/15 text-red-400",
  offerte: "bg-amber-500/15 text-amber-400",
  support: "bg-yellow-500/15 text-yellow-400",
  project: "bg-blue-500/15 text-blue-400",
  factuur: "bg-emerald-500/15 text-emerald-400",
  overig: "bg-gray-500/15 text-gray-400",
};

interface Props {
  threads: EmailThread[];
  isLoading: boolean;
  selectedThreadId: string | null;
  onSelect: (thread: EmailThread) => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  pendingEmailIds: Set<string>;
  categoryCounts: Record<string, number>;
}

export default function ThreadList({
  threads, isLoading, selectedThreadId, onSelect,
  category, onCategoryChange, search, onSearchChange,
  pendingEmailIds, categoryCounts,
}: Props) {
  const filtered = search
    ? threads.filter(t =>
        t.subject?.toLowerCase().includes(search.toLowerCase()) ||
        t.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.sender_email?.toLowerCase().includes(search.toLowerCase())
      )
    : threads;

  return (
    <div className="w-[320px] min-w-[320px] border-r border-erp-border0 flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-erp-border0">
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-erp-text3" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Zoeken in e-mails..."
            className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg pl-9 pr-3 py-2 text-[12px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-erp-border0 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange(cat.key)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition",
              category === cat.key
                ? "bg-erp-blue/15 text-erp-blue"
                : "bg-erp-bg3 text-erp-text3 hover:text-erp-text1"
            )}
          >
            {cat.label}
            {categoryCounts[cat.key] > 0 && cat.key !== "alle" && (
              <span className="ml-0.5 text-[9px] bg-erp-bg4 px-1 rounded-full">
                {categoryCounts[cat.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full bg-erp-bg3 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-erp-text3">
            Geen e-mails gevonden
          </div>
        ) : (
          filtered.map(thread => {
            const active = thread.thread_id === selectedThreadId;
            const hasPending = thread.email_ids?.some(id => pendingEmailIds.has(id));
            return (
              <div
                key={thread.thread_id}
                onClick={() => onSelect(thread)}
                className={cn(
                  "flex gap-3 px-3 py-3 cursor-pointer transition border-b border-erp-border0",
                  active
                    ? "bg-erp-bg3 border-l-2 border-l-erp-blue"
                    : "hover:bg-erp-hover border-l-2 border-l-transparent"
                )}
              >
                <Avatar name={thread.sender_name || thread.sender_email || "?"} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-[12px] truncate", thread.has_unread ? "font-semibold text-erp-text0" : "text-erp-text2")}>
                      {thread.sender_name || thread.sender_email || "Onbekend"}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-erp-amber" />}
                      <span className="text-[10px] text-erp-text3">
                        {thread.last_message_at
                          ? formatDistanceToNow(new Date(thread.last_message_at), { locale: nl, addSuffix: false })
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[11px] truncate flex-1", thread.has_unread ? "text-erp-text1" : "text-erp-text3")}>
                      {thread.subject || "(geen onderwerp)"}
                    </span>
                    {thread.message_count > 1 && (
                      <span className="text-[9px] bg-erp-bg4 text-erp-text3 px-1 rounded-full flex-shrink-0">
                        {thread.message_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-erp-text3 truncate flex-1">
                      {thread.last_snippet}
                    </span>
                    {thread.category && (
                      <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0", categoryColors[thread.category] || categoryColors.overig)}>
                        {thread.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
