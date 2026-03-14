import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader, StatCard, ErpCard, ErpTabs, Badge, ErpButton } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { format, formatDistanceToNow, isAfter, startOfWeek, endOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2 } from "lucide-react";

const sb = supabase as any;

export default function BookingsPage() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const [tab, setTab] = useState("upcoming");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", orgId, tab],
    enabled: !!orgId,
    queryFn: async () => {
      let q = sb.from("bookings")
        .select("*, booking_event_types(name, color, icon, duration_minutes), booking_pages(display_name, slug)")
        .eq("organization_id", orgId)
        .order("start_at", { ascending: tab === "upcoming" });

      if (tab === "upcoming") {
        q = q.eq("status", "confirmed").gte("start_at", new Date().toISOString());
      } else if (tab === "past") {
        q = q.eq("status", "confirmed").lt("start_at", new Date().toISOString());
      } else {
        q = q.eq("status", "cancelled");
      }

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bookingPages = [] } = useQuery({
    queryKey: ["booking-pages", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb.from("booking_pages").select("id, slug, display_name, is_active").eq("organization_id", orgId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: "host" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); toast.success("Boeking geannuleerd"); },
  });

  const upcomingCount = useMemo(() => {
    if (tab !== "upcoming") return bookings.length;
    return bookings.length;
  }, [bookings, tab]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return bookings.filter((b: any) => {
      const d = new Date(b.start_at);
      return d >= weekStart && d <= weekEnd;
    }).length;
  }, [bookings]);

  const bookingUrl = bookingPages[0]?.slug
    ? `${window.location.origin}/book/${bookingPages[0].slug}`
    : null;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader title="Boekingen" desc="Beheer je afspraken en booking pagina's" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Aankomende boekingen" value={String(upcomingCount)} change="deze periode" up={true} />
        <StatCard label="Deze week" value={String(weekCount)} change="lopende week" up={true} />
      </div>

      {/* Booking link */}
      {bookingUrl && (
        <ErpCard className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-erp-text3 mb-1">Mijn booking link</p>
              <p className="text-[13px] text-erp-text0 font-mono">{bookingUrl}</p>
            </div>
            <div className="flex gap-2">
              <ErpButton onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success("Link gekopieerd"); }}>
                <Copy className="w-3.5 h-3.5" /> Kopieer
              </ErpButton>
              <ErpButton onClick={() => window.open(bookingUrl, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </ErpButton>
            </div>
          </div>
        </ErpCard>
      )}

      <ErpTabs
        items={[["upcoming", "Aankomend"], ["past", "Afgelopen"], ["cancelled", "Geannuleerd"]]}
        active={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-erp-text3" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-erp-text3 text-sm">Geen boekingen gevonden</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const et = b.booking_event_types;
            const color = et?.color || "hsl(var(--erp-blue))";
            const startAt = new Date(b.start_at);
            const endAt = new Date(b.end_at);
            const statusColor = b.status === "confirmed" ? "hsl(var(--erp-green))" : b.status === "cancelled" ? "hsl(var(--erp-red))" : "hsl(var(--erp-amber))";

            return (
              <ErpCard key={b.id} className="p-4" hover>
                <div className="flex items-start gap-4">
                  <div className="w-1 h-14 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-erp-text0">{et?.name || "Afspraak"}</span>
                      <Badge color={statusColor}>{b.status === "confirmed" ? "Bevestigd" : b.status === "cancelled" ? "Geannuleerd" : "In afwachting"}</Badge>
                    </div>
                    <p className="text-[13px] text-erp-text1">{b.guest_name} · {b.guest_email}</p>
                    {b.guest_company && <p className="text-xs text-erp-text3">{b.guest_company}</p>}
                    <p className="text-xs text-erp-text2 mt-1">
                      {format(startAt, "EEE d MMM · HH:mm", { locale: nl })} — {format(endAt, "HH:mm")}
                    </p>
                    {b.meeting_url && (
                      <a href={b.meeting_url} target="_blank" rel="noopener" className="text-xs text-erp-blue hover:underline mt-1 inline-block">
                        Meeting link
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {b.status === "confirmed" && isAfter(startAt, new Date()) && (
                      <ErpButton onClick={() => cancelMut.mutate(b.id)} disabled={cancelMut.isPending}>
                        Annuleren
                      </ErpButton>
                    )}
                  </div>
                </div>
              </ErpCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
