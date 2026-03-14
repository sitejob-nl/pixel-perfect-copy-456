import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { streamChat, type ChatMsg } from "@/lib/streamChat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Plus, Trash2, ArrowUp, Bot } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

const sb = supabase as any;

export default function AiAssistantPage() {
  const { session } = useAuth();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const userId = session?.user?.id;
  const qc = useQueryClient();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["ai-chat-sessions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await sb.from("ai_chat_sessions")
        .select("*")
        .eq("organization_id", orgId)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveSession = async (msgs: ChatMsg[], sessionId: string | null) => {
    if (!orgId || !userId || msgs.length === 0) return sessionId;

    const title = msgs[0]?.content?.slice(0, 60) || "Nieuw gesprek";
    const payload = {
      organization_id: orgId,
      user_id: userId,
      title,
      messages: JSON.stringify(msgs),
      updated_at: new Date().toISOString(),
    };

    if (sessionId) {
      await sb.from("ai_chat_sessions").update(payload).eq("id", sessionId);
      return sessionId;
    } else {
      const { data } = await sb.from("ai_chat_sessions").insert(payload).select("id").single();
      qc.invalidateQueries({ queryKey: ["ai-chat-sessions"] });
      return data?.id || null;
    }
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || !session?.access_token || isLoading) return;

    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    abortRef.current = new AbortController();

    try {
      await streamChat({
        messages: newMsgs,
        accessToken: session.access_token,
        onDelta: upsert,
        onDone: async () => {
          setIsLoading(false);
          const finalMsgs = [...newMsgs, { role: "assistant" as const, content: assistantSoFar }];
          const sid = await saveSession(finalMsgs, activeSessionId);
          if (sid) setActiveSessionId(sid);
          qc.invalidateQueries({ queryKey: ["ai-chat-sessions"] });
        },
        signal: abortRef.current.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message}` }]);
        toast.error(e.message);
      }
      setIsLoading(false);
    }
  }, [messages, session, isLoading, activeSessionId]);

  const newConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveSessionId(null);
    setIsLoading(false);
    setInput("");
  };

  const loadSession = (s: any) => {
    try {
      const msgs = typeof s.messages === "string" ? JSON.parse(s.messages) : s.messages;
      setMessages(msgs || []);
      setActiveSessionId(s.id);
    } catch {
      setMessages([]);
      setActiveSessionId(s.id);
    }
  };

  const deleteSession = async (id: string) => {
    await sb.from("ai_chat_sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ai-chat-sessions"] });
    if (activeSessionId === id) newConversation();
  };

  return (
    <div className="flex h-[calc(100vh-100px)] max-w-[1200px] mx-auto gap-0 rounded-xl border border-erp-border0 overflow-hidden bg-erp-bg1">
      {/* Sidebar */}
      <div className="w-[280px] flex-shrink-0 border-r border-erp-border0 flex flex-col bg-erp-bg2">
        <div className="p-3 border-b border-erp-border0">
          <button
            onClick={newConversation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-erp-blue text-white text-[13px] font-medium hover:brightness-110"
          >
            <Plus className="w-4 h-4" /> Nieuw gesprek
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {sessions.map((s: any) => (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[12px]",
                  activeSessionId === s.id ? "bg-erp-bg4 text-erp-text0" : "text-erp-text2 hover:bg-erp-hover"
                )}
                onClick={() => loadSession(s)}
              >
                <Bot className="w-3.5 h-3.5 flex-shrink-0 text-erp-text3" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{s.title}</div>
                  <div className="text-[10px] text-erp-text3">
                    {format(new Date(s.updated_at), "d MMM HH:mm", { locale: nl })}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-erp-bg3 rounded"
                >
                  <Trash2 className="w-3 h-3 text-erp-text3" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-erp-blue to-erp-purple flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-erp-text0 mb-1">SiteJob AI Assistent</h2>
              <p className="text-[13px] text-erp-text3 max-w-sm">
                Stel vragen over je organisatie, vraag om overzichten, of laat suggesties genereren.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {[
                  "Hoe staat de pipeline ervoor?",
                  "Welke klanten hebben aandacht nodig?",
                  "Geef me een dagelijks overzicht",
                  "Wat zijn mijn openstaande taken?",
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="px-3 py-2 rounded-lg bg-erp-bg3 border border-erp-border0 text-[12px] text-erp-text1 hover:bg-erp-hover"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-3 text-[13px]",
                m.role === "user" ? "bg-erp-blue text-white" : "bg-erp-bg3 text-erp-text1"
              )}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-2 [&_code]:text-[11px] [&_code]:bg-erp-bg4 [&_code]:px-1 [&_code]:rounded [&_strong]:text-erp-text0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : m.content}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-erp-bg3 rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-erp-text3 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-erp-text3 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-erp-text3 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-erp-border0 p-4">
          <div className="flex items-end gap-2 bg-erp-bg3 rounded-xl border border-erp-border0 px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder="Stel een vraag..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-erp-text0 text-[13px] placeholder:text-erp-text3 resize-none max-h-[120px]"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-erp-blue text-white disabled:opacity-30 flex-shrink-0"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
