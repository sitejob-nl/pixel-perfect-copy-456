import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { streamChat, type ChatMsg } from "@/lib/streamChat";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, RotateCcw, ArrowUp } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Dashboard", msg: "Geef me een overzicht van de huidige status" },
  { label: "Mijn taken", msg: "Wat zijn mijn openstaande taken?" },
  { label: "Rode klanten", msg: "Welke klanten hebben al lang geen contact gehad?" },
  { label: "Pipeline", msg: "Hoe staat de pipeline ervoor?" },
  { label: "Suggesties", msg: "Geef me concrete actiepunten en suggesties" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AskSiteJobCommandBar({ open, onOpenChange }: Props) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || !session?.access_token || isLoading) return;

    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
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
        messages: [...messages, userMsg],
        accessToken: session.access_token,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        signal: abortRef.current.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message || "Er ging iets mis"}` }]);
      }
      setIsLoading(false);
    }
  }, [messages, session, isLoading]);

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 p-0 gap-0 max-w-[600px] w-[95vw] rounded-xl shadow-2xl [&>button]:hidden">
        {/* Input area */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-erp-border0">
          <Sparkles className="w-4 h-4 text-erp-amber flex-shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Vraag iets aan SiteJob AI..."
            className="flex-1 bg-transparent border-none outline-none text-erp-text0 text-[14px] placeholder:text-erp-text3"
          />
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={reset} className="p-1.5 rounded-md hover:bg-erp-hover text-erp-text3" title="Nieuw gesprek">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className="p-1.5 rounded-md bg-erp-blue text-white disabled:opacity-30"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-md hover:bg-erp-hover text-erp-text3 ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="max-h-[400px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="p-4 space-y-3">
              <p className="text-[12px] text-erp-text3 mb-2">Snelle acties</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => send(qa.msg)}
                    className="px-3 py-1.5 rounded-lg bg-erp-bg3 border border-erp-border0 text-[12px] text-erp-text1 hover:bg-erp-hover transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-erp-text3 pt-2">
                Druk op <kbd className="px-1.5 py-0.5 rounded bg-erp-bg3 border border-erp-border0 text-[10px]">ESC</kbd> om te sluiten
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] ${
                    m.role === "user"
                      ? "bg-erp-blue text-white"
                      : "bg-erp-bg3 text-erp-text1"
                  }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-2 [&_code]:text-[11px] [&_code]:bg-erp-bg4 [&_code]:px-1 [&_code]:rounded">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-erp-bg3 rounded-xl px-3.5 py-2.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-erp-text3 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-erp-text3 rounded-full animate-pulse delay-100" />
                    <span className="w-1.5 h-1.5 bg-erp-text3 rounded-full animate-pulse delay-200" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
