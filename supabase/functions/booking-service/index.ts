import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // ─── GET PAGE ────────────────────────────────────────────
    if (action === "get_page") {
      const { slug } = body;
      const { data: page, error } = await supabase
        .from("booking_pages")
        .select("*, booking_event_types(*)")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !page) {
        return new Response(JSON.stringify({ error: "Page not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter active event types
      page.booking_event_types = (page.booking_event_types || []).filter(
        (et: any) => et.is_active !== false
      );

      return new Response(JSON.stringify(page), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET SLOTS ───────────────────────────────────────────
    if (action === "get_slots") {
      const { page_slug, event_type_slug, date } = body;

      // Get page + event type
      const { data: page } = await supabase
        .from("booking_pages")
        .select("*, booking_event_types(*)")
        .eq("slug", page_slug)
        .eq("is_active", true)
        .single();

      if (!page) {
        return new Response(JSON.stringify({ error: "Page not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventType = (page.booking_event_types || []).find(
        (et: any) => et.slug === event_type_slug
      );
      if (!eventType) {
        return new Response(JSON.stringify({ error: "Event type not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timezone = page.timezone || "Europe/Amsterdam";
      const duration = eventType.duration_minutes || 30;
      const bufferBefore = page.buffer_before_minutes || 0;
      const bufferAfter = page.buffer_after_minutes || 0;
      const minNotice = page.min_notice_hours || 1;

      // Working hours for the day
      const dayOfWeek = new Date(date + "T12:00:00").getDay();
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = dayNames[dayOfWeek];
      const workingHours = page.working_hours || {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
        wednesday: { start: "09:00", end: "17:00" },
        thursday: { start: "09:00", end: "17:00" },
        friday: { start: "09:00", end: "17:00" },
      };

      const dayHours = workingHours[dayName];
      if (!dayHours) {
        return new Response(JSON.stringify({ slots: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get existing bookings for the date
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59`;
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("start_at, end_at")
        .eq("booking_page_id", page.id)
        .eq("status", "confirmed")
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd);

      // Get blocked dates
      const { data: blockedDates } = await supabase
        .from("booking_blocked_dates")
        .select("start_at, end_at, is_all_day")
        .eq("booking_page_id", page.id)
        .lte("start_at", dayEnd)
        .gte("end_at", dayStart);

      // Check all-day block
      if (blockedDates?.some((b: any) => b.is_all_day)) {
        return new Response(JSON.stringify({ slots: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate slots
      const [startH, startM] = dayHours.start.split(":").map(Number);
      const [endH, endM] = dayHours.end.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const now = new Date();
      const minNoticeTime = new Date(now.getTime() + minNotice * 60 * 60 * 1000);

      const slots: string[] = [];
      for (let m = startMinutes; m + duration <= endMinutes; m += 15) {
        const slotH = Math.floor(m / 60);
        const slotM = m % 60;
        const slotTime = `${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`;
        const slotStart = new Date(`${date}T${slotTime}:00`);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        // Check min notice
        if (slotStart <= minNoticeTime) continue;

        // Check conflicts with existing bookings
        const hasConflict = (existingBookings || []).some((b: any) => {
          const bStart = new Date(b.start_at).getTime() - bufferBefore * 60000;
          const bEnd = new Date(b.end_at).getTime() + bufferAfter * 60000;
          return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
        });
        if (hasConflict) continue;

        // Check blocked time ranges
        const isBlocked = (blockedDates || []).some((b: any) => {
          if (b.is_all_day) return true;
          const bStart = new Date(b.start_at).getTime();
          const bEnd = new Date(b.end_at).getTime();
          return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
        });
        if (isBlocked) continue;

        // Check max bookings per day
        if (eventType.max_bookings_per_day) {
          const dayBookings = (existingBookings || []).length;
          if (dayBookings >= eventType.max_bookings_per_day) continue;
        }

        slots.push(slotTime);
      }

      return new Response(JSON.stringify({ slots, duration, timezone }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE BOOKING ──────────────────────────────────────
    if (action === "create_booking") {
      const {
        page_slug, event_type_slug, start_at,
        guest_name, guest_email, guest_phone, guest_company, guest_notes,
        custom_field_values, timezone,
      } = body;

      const { data: page } = await supabase
        .from("booking_pages")
        .select("*, booking_event_types(*)")
        .eq("slug", page_slug)
        .eq("is_active", true)
        .single();

      if (!page) {
        return new Response(JSON.stringify({ error: "Page not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventType = (page.booking_event_types || []).find(
        (et: any) => et.slug === event_type_slug
      );
      if (!eventType) {
        return new Response(JSON.stringify({ error: "Event type not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const duration = eventType.duration_minutes || 30;
      const startDate = new Date(start_at);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      // Generate tokens
      const cancelToken = crypto.randomUUID();
      const rescheduleToken = crypto.randomUUID();

      // Create booking
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          booking_page_id: page.id,
          event_type_id: eventType.id,
          organization_id: page.organization_id,
          host_user_id: page.user_id,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          guest_name,
          guest_email,
          guest_phone: guest_phone || null,
          guest_company: guest_company || null,
          guest_notes: guest_notes || null,
          custom_field_values: custom_field_values || null,
          timezone: timezone || page.timezone || "Europe/Amsterdam",
          cancel_token: cancelToken,
          reschedule_token: rescheduleToken,
          status: page.require_approval ? "pending" : "confirmed",
        })
        .select()
        .single();

      if (error) {
        console.error("Create booking error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Auto-create contact if enabled
      if (eventType.auto_create_contact && guest_email) {
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("organization_id", page.organization_id)
          .eq("email", guest_email)
          .single();

        if (!existingContact) {
          const nameParts = guest_name.split(" ");
          await supabase.from("contacts").insert({
            organization_id: page.organization_id,
            first_name: nameParts[0] || guest_name,
            last_name: nameParts.slice(1).join(" ") || null,
            email: guest_email,
            phone: guest_phone || null,
            source: "booking",
          });
        }
      }

      return new Response(
        JSON.stringify({
          ...booking,
          event_type: eventType,
          page,
          cancel_token: cancelToken,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── CANCEL BOOKING ──────────────────────────────────────
    if (action === "cancel_booking") {
      const { cancel_token, reason } = body;

      const { data: booking, error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: "guest",
          cancel_reason: reason || null,
        })
        .eq("cancel_token", cancel_token)
        .eq("status", "confirmed")
        .select()
        .single();

      if (error || !booking) {
        return new Response(
          JSON.stringify({ error: "Booking not found or already cancelled" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Booking service error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
