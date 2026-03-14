import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { ErpCard, ErpButton, Avatar } from "@/components/erp/ErpPrimitives";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/erp/ErpPrimitives";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CommentWithAuthor {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  is_edited: boolean;
  mentions: string[];
  created_at: string;
  author_name: string;
  author_email: string;
  reply_count: number;
}

interface Props {
  entityType: string;
  entityId: string;
}

export default function CommentsSection({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionTarget, setMentionTarget] = useState<"main" | string>("main");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as CommentWithAuthor[]) ?? [];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["comment-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, full_name, email)")
        .eq("organization_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId?: string }) => {
      // Extract mentions
      const mentionIds: string[] = [];
      const mentionRegex = /@(\S+)/g;
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        const name = match[1];
        const found = members.find((m: any) =>
          ((m.profiles as any)?.full_name || "").toLowerCase().includes(name.toLowerCase())
        );
        if (found) mentionIds.push(found.user_id);
      }

      const { error } = await (supabase as any).from("comments").insert({
        organization_id: orgId,
        entity_type: entityType,
        entity_id: entityId,
        parent_id: parentId || null,
        user_id: user!.id,
        content: text,
        mentions: mentionIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
      toast.success("Opmerking geplaatst");
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    addComment.mutate({ text: content.trim() });
    setContent("");
  };

  const handleReply = (parentId: string) => {
    const text = replyContent[parentId]?.trim();
    if (!text) return;
    addComment.mutate({ text, parentId });
    setReplyContent(prev => ({ ...prev, [parentId]: "" }));
  };

  const toggleReplies = (id: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const insertMention = (target: "main" | string, name: string) => {
    if (target === "main") {
      setContent(prev => prev + `@${name} `);
    } else {
      setReplyContent(prev => ({ ...prev, [target]: (prev[target] || "") + `@${name} ` }));
    }
    setMentionOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <ErpCard className="p-4">
        <div className="relative">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Schrijf een opmerking..."
            className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm min-h-[80px]"
            onKeyDown={e => {
              if (e.key === "@") {
                setMentionTarget("main");
                setMentionOpen(true);
              }
            }}
          />
          {mentionOpen && mentionTarget === "main" && (
            <MentionDropdown members={members} onSelect={(name) => insertMention("main", name)} onClose={() => setMentionOpen(false)} />
          )}
        </div>
        <div className="flex justify-end mt-2">
          <ErpButton primary onClick={handleSubmit} disabled={!content.trim()}>
            Plaatsen
          </ErpButton>
        </div>
      </ErpCard>

      {/* Comment list */}
      {isLoading ? (
        <div className="text-sm text-erp-text3 py-4">Laden...</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-erp-text3 py-4 text-center">Nog geen opmerkingen</div>
      ) : (
        comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            entityType={entityType}
            entityId={entityId}
            expanded={expandedReplies.has(comment.id)}
            onToggle={() => toggleReplies(comment.id)}
            replyContent={replyContent[comment.id] || ""}
            onReplyChange={val => setReplyContent(prev => ({ ...prev, [comment.id]: val }))}
            onReply={() => handleReply(comment.id)}
            members={members}
            mentionOpen={mentionOpen && mentionTarget === comment.id}
            onMentionOpen={() => { setMentionTarget(comment.id); setMentionOpen(true); }}
            onMentionSelect={(name) => insertMention(comment.id, name)}
            onMentionClose={() => setMentionOpen(false)}
          />
        ))
      )}
    </div>
  );
}

function CommentItem({
  comment, entityType, entityId, expanded, onToggle,
  replyContent, onReplyChange, onReply,
  members, mentionOpen, onMentionOpen, onMentionSelect, onMentionClose,
}: {
  comment: CommentWithAuthor;
  entityType: string;
  entityId: string;
  expanded: boolean;
  onToggle: () => void;
  replyContent: string;
  onReplyChange: (v: string) => void;
  onReply: () => void;
  members: any[];
  mentionOpen: boolean;
  onMentionOpen: () => void;
  onMentionSelect: (name: string) => void;
  onMentionClose: () => void;
}) {
  const { data: replies = [] } = useQuery({
    queryKey: ["comment-replies", comment.id],
    enabled: expanded,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_comments")
        .select("*")
        .eq("parent_id", comment.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as CommentWithAuthor[]) ?? [];
    },
  });

  return (
    <ErpCard className="p-4">
      <div className="flex gap-3">
        <Avatar name={comment.author_name || "?"} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-erp-text0">{comment.author_name}</span>
            <span className="text-[11px] text-erp-text3">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: nl })}
            </span>
            {comment.is_edited && <span className="text-[10px] text-erp-text3">(bewerkt)</span>}
          </div>
          <div className="text-[13px] text-erp-text1 mt-1 whitespace-pre-wrap">{comment.content}</div>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={onToggle} className="text-[11px] text-erp-text3 hover:text-erp-text1 cursor-pointer bg-transparent border-none">
              {comment.reply_count > 0 ? `${comment.reply_count} ${comment.reply_count === 1 ? "reactie" : "reacties"}` : "Reageer"}
            </button>
          </div>

          {/* Replies */}
          {expanded && (
            <div className="mt-3 pl-4 border-l-2 border-erp-border0 space-y-3">
              {replies.map((reply: CommentWithAuthor) => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar name={reply.author_name || "?"} size={24} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-erp-text0">{reply.author_name}</span>
                      <span className="text-[10px] text-erp-text3">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: nl })}
                      </span>
                    </div>
                    <div className="text-[12px] text-erp-text1 mt-0.5">{reply.content}</div>
                  </div>
                </div>
              ))}
              <div className="relative">
                <Textarea
                  value={replyContent}
                  onChange={e => onReplyChange(e.target.value)}
                  placeholder="Schrijf een reactie..."
                  className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm min-h-[60px]"
                  rows={2}
                  onKeyDown={e => {
                    if (e.key === "@") onMentionOpen();
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onReply(); }
                  }}
                />
                {mentionOpen && (
                  <MentionDropdown members={members} onSelect={onMentionSelect} onClose={onMentionClose} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErpCard>
  );
}

function MentionDropdown({ members, onSelect, onClose }: { members: any[]; onSelect: (name: string) => void; onClose: () => void }) {
  return (
    <div className="absolute z-50 bg-erp-bg2 border border-erp-border0 rounded-lg shadow-lg p-1 max-h-[200px] overflow-y-auto mt-1 w-[200px]">
      {members.map((m: any) => {
        const name = (m.profiles as any)?.full_name || (m.profiles as any)?.email || "?";
        return (
          <div
            key={m.user_id}
            onClick={() => { onSelect(name.split(" ")[0]); onClose(); }}
            className="px-3 py-1.5 text-[12px] text-erp-text0 hover:bg-erp-hover rounded cursor-pointer"
          >
            {name}
          </div>
        );
      })}
      {members.length === 0 && <div className="px-3 py-1.5 text-[12px] text-erp-text3">Geen teamleden</div>}
    </div>
  );
}
