import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: corsHeaders });

    const supabase = serviceClient();
    const anonSupabase = serviceClient();
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userResult, error: userError } = await anonSupabase.auth.getUser(token);
    if (userError || !userResult.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication." }), { status: 401, headers: corsHeaders });
    }

    const { track_id, download, preview } = await request.json();
    if (typeof track_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(track_id)) {
      return new Response(JSON.stringify({ error: "A valid track_id is required." }), { status: 400, headers: corsHeaders });
    }

    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .select("id,project_id,track_type,is_paid,audio_path,media_path,projects(artist_id,is_paid,is_published,artists(user_id))")
      .eq("id", track_id)
      .maybeSingle();
    if (trackError) throw trackError;
    if (!track) return new Response(JSON.stringify({ error: "Track not found." }), { status: 404, headers: corsHeaders });

    if (preview && track.projects?.is_published) {
      const mediaPath = track.media_path || track.audio_path;
      if (!mediaPath) {
        return new Response(JSON.stringify({ error: "This media item has no uploaded file." }), { status: 404, headers: corsHeaders });
      }
      const { data, error } = await supabase.storage
        .from("zikly-audio")
        .createSignedUrl(mediaPath, 180);
      if (error) throw error;
      return new Response(JSON.stringify({ url: data.signedUrl, expires_in: 180, is_preview: true, preview_duration: 30 }), { headers: corsHeaders });
    }

    const artistUserId = track.projects?.artists?.user_id;
    const isOwner = artistUserId === userResult.user.id;
    let authorized = isOwner;
    if (!authorized) {
      const { data: unlock, error: unlockError } = await supabase
        .from("unlocks")
        .select("id")
        .eq("user_id", userResult.user.id)
        .or(`track_id.eq.${track_id},project_id.eq.${track.project_id}`)
        .limit(1)
        .maybeSingle();
      if (unlockError) throw unlockError;
      authorized = Boolean(unlock);
      if (!authorized) {
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userResult.user.id)
          .eq("artist_id", track.projects?.artist_id)
          .gt("expires_at", new Date().toISOString())
          .limit(1)
          .maybeSingle();
        if (subscriptionError) throw subscriptionError;
        authorized = Boolean(subscription);
      }
      if (!authorized && !track.is_paid && !track.projects?.is_paid && track.projects?.is_published) authorized = true;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Content is not unlocked for this session." }), { status: 403, headers: corsHeaders });
    }
    const mediaPath = track.media_path || track.audio_path;
    if (!mediaPath) {
      return new Response(JSON.stringify({ error: "This media item has no uploaded file." }), { status: 404, headers: corsHeaders });
    }

    const { data, error } = await supabase.storage
      .from("zikly-audio")
      .createSignedUrl(mediaPath, 300, download ? { download: true } : undefined);
    if (error) throw error;
    return new Response(JSON.stringify({ url: data.signedUrl, expires_in: 300 }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
