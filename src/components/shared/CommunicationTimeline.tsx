import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle, Phone, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { ErpCard, FilterButton } from "@/components/erp/ErpPrimitives";

type ChannelFilter = "all" | "email" | "whatsapp" | "phone";

interface TimelineItem {
  id: string;
  channel: "email" | "whatsapp" | "phone";
  direction: "in" | "out";
  subject?: string;
  content?: string;
  date: string;
  from?: string;
  to?: string;
}

interface Props {
  companyId?: string;
  contactId?: string;
  contactIds?: string[]; // for company: all contact IDs belonging to company
}

export default function CommunicationTimeline({ companyId, contactId, contactIds = [] }: Props) {
  const [filter, setFilter] = useState<ChannelFilter>("all");

  // Emails
  const { data: emails = [] } = useQuery({
    queryKey: ["comm-emails", companyId, contactId],
    enabled: !!(companyId || contactId),
    queryFn: async () => {
      let q = supabase.from("communications").select("*").eq("channel", "email").order("created_at", { ascending: false }).limit(50);
      if (companyId) q = q.eq("company_id", companyId);
      else if (contactId) q = q.eq("contact_id", contactId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((e: any): TimelineItem => ({
        id: e.id,
        channel: "email",
        direction: e.direction === "inbound" ? "in" : "out",
        subject: e.subject,
        content: e.content?.slice(0, 120),
        date: e.created_at,
        from: e.from_address,
        to: e.to_address,
      }));
    },
  });

  // WhatsApp
  const { data: whatsapp = [] } = useQuery({
    queryKey: ["comm-whatsapp", companyId, contactId, contactIds],
    enabled: !!(contactId || contactIds.length > 0),
    queryFn: async () => {
      const ids = contactId ? [contactId] : contactIds;
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*, contacts(first_name, last_name)")
        .in("contact_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((m: any): TimelineItem => ({
        id: m.id,
        channel: "whatsapp",
        direction: m.direction === "inbound" ? "in" : "out",
        content: m.body?.slice(0, 120),
        date: m.created_at,
        from: m.direction === "inbound" ? (m.contacts ? `${m.contacts.first_name} ${m.contacts.last_name ?? ""}` : m.from_number) : "Jij",
      }));
    },
  });

  // Calls
  const { data: calls = [] } = useQuery({
    queryKey: ["comm-calls", companyId, contactId],
    enabled: !!(companyId || contactId),
    queryFn: async () => {
      let q = supabase.from("call_log").select("*").order("started_at", { ascending: false }).limit(50);
      if (companyId) q = q.eq("matched_company_id", companyId);
      else if (contactId) q = q.eq("matched_contact_id", contactId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((c: any): TimelineItem => ({
        id: c.id,
        channel: "phone",
        direction: c.direction === "inbound" ? "in" : "out",
        subject: c.caller_name || c.destination_name || "Telefoongesprek",
        content: c.ai_summary?.slice(0, 120) || `Duur: ${c.duration_seconds ?? 0}s`,
        date: c.started_at || c.created_at,
        from: c.caller_number,
        to: c.destination_number,
      }));
    },
  });

  const timeline = useMemo(() => {
    let items = [...emails, ...whatsapp, ...calls];
    if (filter !== "all") items = items.filter(i => i.channel === filter);
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [emails, whatsapp, calls, filter]);

  const channelIcon = (ch: string) => {
    switch (ch) {
      case "email": return <Mail className="w-4 h-4" />;
      case "whatsapp": return <MessageCircle className="w-4 h-4" />;
      case "phone": return <Phone className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Alles</FilterButton>
        <FilterButton active={filter === "email"} onClick={() => setFilter("email")}><Mail className="w-3 h-3" /> Email</FilterButton>
        <FilterButton active={filter === "whatsapp"} onClick={() => setFilter("whatsapp")}><MessageCircle className="w-3 h-3" /> WhatsApp</FilterButton>
        <FilterButton active={filter === "phone"} onClick={() => setFilter("phone")}><Phone className="w-3 h-3" /> Telefoon</FilterButton>
      </div>

      {timeline.length === 0 && <p className="text-sm text-erp-text3 py-4">Geen communicatie gevonden</p>}

      <div className="space-y-0">
        {timeline.map((item, i) => (
          <div key={item.id} className={`flex gap-3 py-3 ${i < timeline.length - 1 ? "border-b border-erp-border0" : ""}`}>
            <div className="flex flex-col items-center gap-1 pt-0.5">
              <span className="text-erp-text3">{channelIcon(item.channel)}</span>
              {item.direction === "in" ? (
                <ArrowDownLeft className="w-3 h-3 text-erp-green" />
              ) : (
                <ArrowUpRight className="w-3 h-3 text-erp-blue" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {item.subject && <div className="text-[13px] font-medium text-erp-text0 truncate">{item.subject}</div>}
              {item.content && <div className="text-xs text-erp-text2 mt-0.5 truncate">{item.content}</div>}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-erp-text3">
                {item.from && <span>Van: {item.from}</span>}
                {item.to && <span>Naar: {item.to}</span>}
                <span>{formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: nl })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
