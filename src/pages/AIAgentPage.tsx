import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/erp/ErpIcons";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolUses?: { name: string; status: "running" | "done" | "error" }[];
}

const SYSTEM_PROMPT = `Je bent de SiteJob AI Agent — een krachtige data intelligence assistent ingebouwd in het SiteJob ERP platform. Je hebt toegang tot diverse Apify scrapers en tools via MCP.

Je kunt onder andere:
- Google Places doorzoeken op bedrijven in specifieke regio's en industrieën
- Instagram, Facebook, LinkedIn, TikTok en YouTube profielen en posts scrapen
- Websites crawlen en content extraheren
- Trustpilot reviews ophalen
- Leads vinden op basis van criteria
- Web pagina's doorzoeken met RAG browser

Antwoord altijd in het Nederlands tenzij anders gevraagd. Wees behulpzaam, concreet en actiegericht. Wanneer je tools gebruikt, leg kort uit wat je doet.`;

export default function AIAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
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
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            if (event.type === "content_block_start") {
              if (event.content_block?.type === "mcp_tool_use") {
                const toolName = event.content_block.name || "tool";
                toolUses = [...(toolUses || []), { name: toolName, status: "running" }];
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    toolUses: [...(toolUses || [])],
                  };
                  return updated;
                });
              }
            }

            if (event.type === "content_block_stop") {
              // Mark last running tool as done
              if (toolUses?.some((t) => t.status === "running")) {
                toolUses = toolUses?.map((t, i) =>
                  i === toolUses!.length - 1 && t.status === "running"
                    ? { ...t, status: "done" }
                    : t
                );
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    toolUses: [...(toolUses || [])],
                  };
                  return updated;
                });
              }
            }

            if (event.type === "content_block_delta") {
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
            }
          } catch {
            // ignore parse errors for partial chunks
          }
        }
      }

      // Final update
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: fullText || "(Geen antwoord ontvangen)",
          toolUses: toolUses?.map((t) => ({ ...t, status: "done" as const })),
        };
        return updated;
      });
    } catch (error: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `❌ Fout: ${error.message}`,
        };
        return updated;
      });
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

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-90px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-erp-border0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-erp-purple to-erp-blue flex items-center justify-center">
            <Icons.Bot className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-erp-text0">AI Agent</h1>
            <p className="text-[11px] text-erp-text3">
              Claude + Apify MCP · Google Places, Instagram, LinkedIn, Web Scraping & meer
            </p>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-[12px] text-erp-text3 hover:text-erp-text1 px-3 py-1.5 rounded-lg hover:bg-erp-hover transition-colors"
        >
          Nieuw gesprek
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
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
      <div className="border-t border-erp-border0 pt-3">
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
          Claude Sonnet 4 · Apify MCP · Shift+Enter voor nieuwe regel
        </p>
      </div>
    </div>
  );
}
