import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Sign in to open your Fan Vault." }), { status: 401, headers: corsHeaders });

    const supabase = serviceClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userResult.user) return new Response(JSON.stringify({ error: "Invalid authentication." }), { status: 401, headers: corsHeaders });

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role").eq("id", userResult.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "fan") return new Response(JSON.stringify({ error: "The Fan Vault is for fan accounts." }), { status: 403, headers: corsHeaders });

    const now = new Date().toISOString();
    const [{ data: unlocks, error: unlockError }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
      supabase.from("unlocks").select("track_id,project_id,artist_id,created_at").eq("user_id", userResult.user.id),
      supabase.from("subscriptions").select("artist_id,starts_at,expires_at,artists(name,slug)").eq("user_id", userResult.user.id).order("expires_at", { ascending: false }),
    ]);
    if (unlockError) throw unlockError;
    if (subscriptionError) throw subscriptionError;

    const activeSubscriptions = (subscriptions || []).filter((item) => item.expires_at > now);
    const trackIds = new Set((unlocks || []).map((item) => item.track_id).filter(Boolean));
    const projectIds = new Set((unlocks || []).map((item) => item.project_id).filter(Boolean));
    const subscribedArtistIds = activeSubscriptions.map((item) => item.artist_id);
    let tracks = [];

    if (trackIds.size) {
      const { data, error } = await supabase.from("tracks")
        .select("id,project_id,title,description,track_type,is_paid,price_xaf,audio_path,media_path,projects(title,artist_id,artists(name,slug))")
        .in("id", Array.from(trackIds));
      if (error) throw error;
      tracks.push(...(data || []));
    }

    if (projectIds.size) {
      const { data, error } = await supabase.from("tracks")
        .select("id,project_id,title,description,track_type,is_paid,price_xaf,audio_path,media_path,projects(title,artist_id,artists(name,slug))")
        .in("project_id", Array.from(projectIds));
      if (error) throw error;
      tracks.push(...(data || []));
    }

    if (subscribedArtistIds.length) {
      const { data: subscribedProjects, error: projectError } = await supabase.from("projects")
        .select("id")
        .in("artist_id", subscribedArtistIds)
        .eq("is_published", true);
      if (projectError) throw projectError;
      const subscribedProjectIds = (subscribedProjects || []).map((project) => project.id);
      if (subscribedProjectIds.length) {
        const { data, error } = await supabase.from("tracks")
          .select("id,project_id,title,description,track_type,is_paid,price_xaf,audio_path,media_path,projects(title,artist_id,artists(name,slug))")
          .in("project_id", subscribedProjectIds);
        if (error) throw error;
        tracks.push(...(data || []));
      }
    }

    const uniqueTracks = Array.from(new Map(tracks.map((track) => [track.id, track])).values());
    const items = await Promise.all(uniqueTracks.map(async (track) => {
      const mediaPath = track.media_path || track.audio_path;
      let url = null;
      if (mediaPath) {
        const { data, error } = await supabase.storage.from("zikly-audio").createSignedUrl(mediaPath, 300);
        if (error) throw error;
        url = data.signedUrl;
      }
      const projectUnlocked = projectIds.has(track.project_id);
      const trackUnlocked = trackIds.has(track.id);
      return {
        id: track.id,
        title: track.title,
        description: track.description,
        track_type: track.track_type,
        project_title: track.projects?.title || "Creator release",
        artist_name: track.projects?.artists?.name || "Creator",
        artist_slug: track.projects?.artists?.slug || "",
        access: trackUnlocked || projectUnlocked ? "purchase" : "subscription",
        url,
      };
    }));

    return new Response(JSON.stringify({
      items,
      subscriptions: (subscriptions || []).map((item) => ({
        artist_id: item.artist_id,
        starts_at: item.starts_at,
        expires_at: item.expires_at,
        artist_name: item.artists?.name,
        artist_slug: item.artists?.slug,
      })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
