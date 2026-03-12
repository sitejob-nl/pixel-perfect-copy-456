import { useState, useRef, useEffect } from "react";
import { sendPortalMessage } from "@/hooks/useClientPortal";

interface Props {
  token: string;
  messages: any[];
  onReload: () => void;
  variant?: "admin" | "client";
}

export default function PortalChat({ token, messages, onReload, variant = "client" }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendPortalMessage(token, text.trim());
      setText("");
      onReload();
    } catch { /* ignore */ }
    setSending(false);
  };

  const isOwn = (msg: any) => msg.sender_type === (variant === "client" ? "client" : "admin");

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Nog geen berichten</div>
        )}
        {messages.map((m: any) => (
          <div key={m.id} className={`flex ${isOwn(m) ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              isOwn(m)
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            }`}>
              <div className={`text-[10px] mb-0.5 ${isOwn(m) ? "text-blue-200" : "text-gray-500"}`}>
                {m.sender_name}
              </div>
              <div className="text-sm whitespace-pre-wrap">{m.message}</div>
              <div className={`text-[10px] mt-1 ${isOwn(m) ? "text-blue-200" : "text-gray-400"}`}>
                {new Date(m.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-gray-200 p-3 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          placeholder="Typ een bericht..."
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Verstuur
        </button>
      </div>
    </div>
  );
}
