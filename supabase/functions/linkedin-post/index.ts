import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function decrypt(encoded: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}

async function registerImageUpload(accessToken: string, personUrn: string): Promise<{ uploadUrl: string; asset: string }> {
  const res = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Register upload error:", res.status, errBody);
    throw new Error(`Failed to register image upload: ${res.status}`);
  }

  const data = await res.json();
  const uploadUrl = data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const asset = data.value.asset;
  return { uploadUrl, asset };
}

async function uploadImageBinary(uploadUrl: string, accessToken: string, imageBytes: Uint8Array, contentType: string): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: imageBytes,
  });

  if (!res.ok && res.status !== 201) {
    const errBody = await res.text();
    console.error("Image upload error:", res.status, errBody);
    throw new Error(`Failed to upload image: ${res.status}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || serviceKey.slice(0, 32);

    // Authenticate user
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, text, url, url_title, url_description, image_base64, image_content_type, visibility } = await req.json();
    if (!text || !organization_id) {
      return new Response(JSON.stringify({ error: "text and organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get LinkedIn connection
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: conn, error: connErr } = await adminClient
      .from("linkedin_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "LinkedIn niet gekoppeld. Ga naar Instellingen → LinkedIn." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check token expiry
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "LinkedIn token verlopen. Koppel opnieuw via Instellingen." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = decrypt(conn.access_token_encrypted, encryptionKey);
    const personUrn = `urn:li:person:${conn.linkedin_user_id}`;
    const visibilityValue = visibility === "CONNECTIONS" ? "CONNECTIONS" : "PUBLIC";

    // Determine post type and build body accordingly
    let imageAsset: string | null = null;

    // If image provided, register and upload first
    if (image_base64) {
      const contentType = image_content_type || "image/png";
      const { uploadUrl, asset } = await registerImageUpload(accessToken, personUrn);
      
      // Decode base64 to binary
      const binaryStr = atob(image_base64);
      const imageBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        imageBytes[i] = binaryStr.charCodeAt(i);
      }
      
      await uploadImageBinary(uploadUrl, accessToken, imageBytes, contentType);
      imageAsset = asset;
    }

    // Build UGC post body (using ugcPosts API for image/URL support)
    let shareMediaCategory = "NONE";
    const media: any[] = [];

    if (imageAsset) {
      shareMediaCategory = "IMAGE";
      media.push({
        status: "READY",
        media: imageAsset,
      });
    } else if (url) {
      shareMediaCategory = "ARTICLE";
      const articleMedia: any = {
        status: "READY",
        originalUrl: url,
      };
      if (url_title) articleMedia.title = { text: url_title };
      if (url_description) articleMedia.description = { text: url_description };
      media.push(articleMedia);
    }

    const ugcBody: any = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory,
          ...(media.length > 0 ? { media } : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibilityValue,
      },
    };

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(ugcBody),
    });

    if (!postRes.ok) {
      const errBody = await postRes.text();
      console.error("LinkedIn post error:", postRes.status, errBody);
      return new Response(JSON.stringify({ error: "LinkedIn post mislukt", details: errBody }), {
        status: postRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const postId = postRes.headers.get("x-restli-id") || "unknown";

    return new Response(JSON.stringify({ success: true, post_id: postId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("linkedin-post error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
