import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Icons } from "@/components/erp/ErpIcons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

const typeIcons: Record<string, string> = {
  task_assigned: "✓",
  comment_mention: "💬",
  comment_reply: "↩",
  invoice_overdue: "⚠",
  project_delivered: "🚀",
  company_inactive: "🔴",
  checklist_overdue: "📋",
  task_overdue: "⏰",
  general: "🔔",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notification-count", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("fn_unread_notification_count", { p_user_id: user!.id });
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as Notification[]) ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["notification-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await (supabase as any).rpc("fn_mark_notifications_read", { p_ids: unreadIds });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("fn_mark_notifications_read", { p_ids: [id] });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const handleClick = (n: Notification) => {
    if (!n.is_read) markOneRead.mutate(n.id);
    if (n.action_url) {
      setOpen(false);
      navigate(n.action_url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-[34px] h-[34px] rounded-lg flex items-center justify-center cursor-pointer text-erp-text2 bg-transparent border-none relative hover:text-erp-text1 transition-colors">
          <Icons.Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-[4px] right-[4px] min-w-[16px] h-[16px] rounded-full bg-erp-red text-white text-[9px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 bg-erp-bg2 border-erp-border0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-erp-border0">
          <span className="text-[13px] font-semibold text-erp-text0">Notificaties</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-[11px] text-erp-blue hover:underline cursor-pointer bg-transparent border-none"
            >
              Alles gelezen
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Icons.Bell className="w-8 h-8 text-erp-text3 mx-auto mb-2 opacity-40" />
              <div className="text-[13px] text-erp-text3">Geen notificaties</div>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex gap-3 px-4 py-3 cursor-pointer hover:bg-erp-hover transition-colors border-b border-erp-border0 last:border-none",
                  !n.is_read && "bg-erp-bg3 border-l-2 border-l-erp-blue"
                )}
              >
                <span className="text-base w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {typeIcons[n.type] || typeIcons.general}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-[12px]", !n.is_read ? "font-semibold text-erp-text0" : "text-erp-text1")}>
                    {n.title}
                  </div>
                  {n.message && (
                    <div className="text-[11px] text-erp-text2 mt-0.5 truncate">{n.message}</div>
                  )}
                  <div className="text-[10px] text-erp-text3 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: nl })}
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
