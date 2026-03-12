import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/erp/ErpIcons";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useAiChatSessions,
  useCreateChatSession,
  useUpdateChatSession,
  useDeleteChatSession,
  type ChatMessage,
} from "@/hooks/useAiChatSessions";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const SYSTEM_PROMPT = `Je bent de SiteJob AI Agent — een krachtige data intelligence assistent ingebouwd in het SiteJob ERP platform. Je hebt toegang tot diverse Apify scrapers en tools.

Je kunt onder andere:
- Google Places doorzoeken op bedrijven in specifieke regio's en industrieën
- Instagram, Facebook, LinkedIn, TikTok en YouTube profielen en posts scrapen
- Websites crawlen en content extraheren
- Trustpilot reviews ophalen
- Leads vinden op basis van criteria
- Web pagina's doorzoeken

Antwoord altijd in het Nederlands tenzij anders gevraagd. Wees behulpzaam, concreet en actiegericht. Wanneer je tools gebruikt, leg kort uit wat je doet.`;

export default function AIAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<{ input_tokens: number; output_tokens: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: org } = useOrganization();
  const { data: sessions } = useAiChatSessions();
  const createSession = useCreateChatSession();
  const updateSession = useUpdateChatSession();
  const deleteSession = useDeleteChatSession();

  // Check if Anthropic key is set
  const [keyStatus, setKeyStatus] = useState<{ anthropic_key_set: boolean } | null>(null);
  useEffect(() => {
    if (!org?.organization_id) return;
    supabase
      .from("organization_api_keys")
      .select("anthropic_key_set")
      .eq("organization_id", org.organization_id)
      .maybeSingle()
      .then(({ data }) => setKeyStatus(data as any));
  }, [org?.organization_id]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const saveSession = useCallback(
    async (msgs: ChatMessage[], sessionId: string | null) => {
      if (msgs.length === 0) return sessionId;

      const title = msgs[0]?.content?.slice(0, 50) || "Nieuw gesprek";

      if (!sessionId) {
        try {
          const result = await createSession.mutateAsync({ title, messages: msgs });
          return result.id;
        } catch {
          return null;
        }
      } else {
        try {
          await updateSession.mutateAsync({ id: sessionId, messages: msgs });
        } catch {
          // ignore
        }
        return sessionId;
      }
    },
    [createSession, updateSession]
  );

  const loadSession = (session: { id: string; messages: ChatMessage[] }) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession.mutateAsync(id);
    if (activeSessionId === id) {
      startNewChat();
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = { role: "assistant", content: "", toolUses: [] };
    setMessages([...newMessages, assistantMsg]);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Get user's access token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Niet ingelogd. Log opnieuw in.");

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            messages: apiMessages,
            system: SYSTEM_PROMPT,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullText = "";
      let toolUses: ChatMessage["toolUses"] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          // Handle named SSE events: "event: <type>\ndata: <payload>"
          if (line.startsWith("event:")) continue; // skip event line, data follows

          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case "text": {
                fullText += event.text || "";
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullText,
                    toolUses: [...(toolUses || [])],
                  };
                  return updated;
                });
                break;
              }

              case "tool_start": {
                const toolName = event.tool || "tool";
                toolUses = [...(toolUses || []), { name: toolName, status: "running" }];
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    toolUses: [...(toolUses || [])],
                  };
                  return updated;
                });
                break;
              }

              case "tool_done": {
                toolUses = toolUses?.map((t) =>
                  t.status === "running" ? { ...t, status: "done" } : t
                );
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    toolUses: [...(toolUses || [])],
                  };
                  return updated;
                });
                break;
              }

              case "error": {
                throw new Error(event.message || "Onbekende fout van de AI agent");
              }

              case "done": {
                // Stream complete — capture usage
                if (event.usage) {
                  setLastUsage(event.usage);
                }
                break;
              }

              case "model": {
                setActiveModel(event.id || event.model || null);
                break;
              }

              // Legacy Anthropic format fallback
              case "content_block_delta": {
                if (event.delta?.type === "text_delta" && event.delta.text) {
                  fullText += event.delta.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: fullText,
                      toolUses: [...(toolUses || [])],
                    };
                    return updated;
                  });
                }
                break;
              }
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Onbekende fout van de AI agent") {
              // ignore parse errors for partial chunks
            } else {
              throw e;
            }
          }
        }
      }

      // Final update
      const hadTools = toolUses && toolUses.length > 0;
      const finalContent =
        fullText ||
        (hadTools
          ? "✅ Tools zijn uitgevoerd. De resultaten zijn verwerkt."
          : "(Geen antwoord ontvangen)");

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        {
          role: "assistant",
          content: finalContent,
          toolUses: toolUses?.map((t) => ({ ...t, status: "done" as const })),
        },
      ];

      setMessages(finalMessages);

      // Save to database
      const sid = await saveSession(finalMessages, activeSessionId);
      if (sid) setActiveSessionId(sid);
    } catch (error: any) {
      const errorMessages: ChatMessage[] = [
        ...newMessages,
        { role: "assistant", content: `❌ Fout: ${error.message}` },
      ];
      setMessages(errorMessages);
      const sid = await saveSession(errorMessages, activeSessionId);
      if (sid) setActiveSessionId(sid);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const missingKey = keyStatus !== null && !keyStatus.anthropic_key_set;

  return (
    <div className="flex h-full max-h-[calc(100vh-90px)]">
      {/* Session sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-erp-border0 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-erp-border0">
            <button
              onClick={startNewChat}
              className="w-full text-[12px] font-medium text-erp-text0 bg-erp-bg3 hover:bg-erp-hover rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
            >
              <Icons.Plus className="w-3.5 h-3.5" />
              Nieuw gesprek
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions?.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-erp-hover transition-colors border-b border-erp-border0/50",
                  activeSessionId === session.id && "bg-erp-bg3"
                )}
                onClick={() => loadSession(session)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-erp-text0 truncate">
                    {session.title}
                  </p>
                  <p className="text-[10px] text-erp-text3">
                    {format(new Date(session.updated_at), "d MMM HH:mm", { locale: nl })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-erp-text3 hover:text-erp-red transition-all p-1"
                >
                  <Icons.Trash className="w-3 h-3" />
                </button>
              </div>
            ))}
            {sessions?.length === 0 && (
              <p className="text-[11px] text-erp-text3 text-center py-6 px-3">
                Nog geen gesprekken
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 px-4 pt-1 border-b border-erp-border0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-erp-text3 hover:text-erp-text1 p-1 rounded-md hover:bg-erp-hover transition-colors"
            >
              <Icons.Menu className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-erp-purple to-erp-blue flex items-center justify-center">
              <Icons.Bot className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-erp-text0">AI Agent</h1>
              <p className="text-[11px] text-erp-text3">
                Claude + Apify · Google Places, Instagram, LinkedIn, Web Scraping & meer
              </p>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="text-[12px] text-erp-text3 hover:text-erp-text1 px-3 py-1.5 rounded-lg hover:bg-erp-hover transition-colors"
          >
            Nieuw gesprek
          </button>
        </div>

        {/* Missing API key banner */}
        {missingKey && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-lg bg-erp-orange/10 border border-erp-orange/30 text-[13px] text-erp-orange flex items-center gap-2">
            <span>⚠️</span>
            <span>Anthropic API key is niet ingesteld. Ga naar <strong>Instellingen → API Keys</strong> om deze te configureren.</span>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 px-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-erp-bg3 flex items-center justify-center mb-4">
                <Icons.Bot className="w-7 h-7 text-erp-purple" />
              </div>
              <h2 className="text-[15px] font-semibold text-erp-text0 mb-2">
                SiteJob AI Agent
              </h2>
              <p className="text-[13px] text-erp-text3 max-w-md leading-relaxed">
                Stel een vraag of geef een opdracht. Ik heb toegang tot Google Places, Instagram,
                LinkedIn, Facebook, TikTok, YouTube, Trustpilot, en web scraping tools.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                {[
                  "Zoek alle webdesign bureaus in Amsterdam via Google Places",
                  "Scrape de Instagram van @nike",
                  "Crawl de website van example.com en geef een samenvatting",
                  "Zoek leads in de bouw sector in Rotterdam",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="text-left text-[12px] text-erp-text2 p-3 rounded-lg border border-erp-border0 hover:border-erp-border1 hover:bg-erp-hover transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 animate-fade-up",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-erp-bg3 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icons.Bot className="w-4 h-4 text-erp-purple" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-xl px-4 py-3 text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-erp-blue text-white rounded-br-sm"
                    : "bg-erp-bg2 text-erp-text0 rounded-bl-sm"
                )}
              >
                {/* Tool use indicators */}
                {msg.toolUses && msg.toolUses.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {msg.toolUses.map((tool, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-md bg-erp-bg3/50"
                      >
                        {tool.status === "running" ? (
                          <div className="w-3 h-3 border-2 border-erp-purple border-t-transparent rounded-full animate-spin-loader" />
                        ) : tool.status === "error" ? (
                          <span className="text-erp-red">✗</span>
                        ) : (
                          <span className="text-erp-green">✓</span>
                        )}
                        <span className="text-erp-text2 font-mono">{tool.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === "assistant" && msg.content ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_code]:bg-erp-bg4 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px] [&_pre]:bg-erp-bg4 [&_pre]:p-3 [&_pre]:rounded-lg [&_a]:text-erp-blue-light">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.role === "assistant" && !msg.content && isLoading ? (
                  <div className="flex items-center gap-2 text-erp-text3">
                    <div className="w-3 h-3 border-2 border-erp-purple border-t-transparent rounded-full animate-spin-loader" />
                    <span className="text-[12px]">Denken...</span>
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-erp-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icons.Users className="w-4 h-4 text-erp-blue" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-erp-border0 pt-3 px-4 pb-2">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Stel een vraag of geef een opdracht..."
              rows={1}
              className="flex-1 resize-none bg-erp-bg2 border border-erp-border0 rounded-xl px-4 py-3 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:border-erp-blue/50 transition-colors min-h-[44px] max-h-[120px]"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                input.trim() && !isLoading
                  ? "bg-erp-blue hover:bg-erp-blue-light text-white"
                  : "bg-erp-bg3 text-erp-text3 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin-loader" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-erp-text3 mt-2 text-center">
            Claude Sonnet 4 · Apify Tools · Shift+Enter voor nieuwe regel
          </p>
        </div>
      </div>
    </div>
  );
}
