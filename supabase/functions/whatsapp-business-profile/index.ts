import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v25.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "get";

    // Get org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = membership.organization_id;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get active WhatsApp account
    const { data: account } = await serviceClient
      .from("whatsapp_accounts")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .single();

    if (!account) {
      return new Response(JSON.stringify({ error: "No active WhatsApp account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = account.access_token;
    const phoneNumberId = account.phone_number_id;

    // GET profile
    if (action === "get") {
      const url = `${META_API}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message || JSON.stringify(result));

      const profile = result.data?.[0] || {};
      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPLOAD profile picture (3-step Resumable Upload API)
    if (action === "upload_photo") {
      const { file_base64, file_type, file_name } = body;
      if (!file_base64) {
        return new Response(JSON.stringify({ error: "Missing file_base64" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode base64 to binary
      const binaryStr = atob(file_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const fileLength = bytes.length;
      const mimeType = file_type || "image/jpeg";

      // Step 1: Create upload session
      const createSessionUrl = `${META_API}/app/uploads?file_length=${fileLength}&file_type=${encodeURIComponent(mimeType)}&file_name=${encodeURIComponent(file_name || "profile.jpg")}`;
      const sessionRes = await fetch(createSessionUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sessionResult = await sessionRes.json();
      if (!sessionRes.ok) {
        console.error("Create session error:", sessionResult);
        throw new Error(`Upload session failed: ${sessionResult?.error?.message || JSON.stringify(sessionResult)}`);
      }

      const uploadSessionId = sessionResult.id;
      console.log("Upload session created:", uploadSessionId);

      // Step 2: Upload the file data
      const uploadUrl = `${META_API}/${uploadSessionId}`;
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `OAuth ${accessToken}`,
          "Content-Type": mimeType,
          file_offset: "0",
        },
        body: bytes,
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) {
        console.error("Upload error:", uploadResult);
        throw new Error(`File upload failed: ${uploadResult?.error?.message || JSON.stringify(uploadResult)}`);
      }

      const handle = uploadResult.h;
      console.log("File uploaded, handle:", handle);

      // Step 3: Update business profile with the handle
      const profileUrl = `${META_API}/${phoneNumberId}/whatsapp_business_profile`;
      const profileRes = await fetch(profileUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          profile_picture_handle: handle,
        }),
      });
      const profileResult = await profileRes.json();
      if (!profileRes.ok) {
        console.error("Profile update error:", profileResult);
        throw new Error(`Profile picture update failed: ${profileResult?.error?.message || JSON.stringify(profileResult)}`);
      }

      return new Response(JSON.stringify({ success: true, handle }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE profile (text fields)
    if (action === "update") {
      const payload: Record<string, unknown> = {
        messaging_product: "whatsapp",
      };

      const fields = ["about", "address", "description", "email", "vertical"];
      for (const f of fields) {
        if (body[f] !== undefined) payload[f] = body[f];
      }
      if (body.websites !== undefined) {
        payload.websites = body.websites;
      }

      const url = `${META_API}/${phoneNumberId}/whatsapp_business_profile`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error?.message || JSON.stringify(result));

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use 'get', 'update', or 'upload_photo'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Business profile error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
