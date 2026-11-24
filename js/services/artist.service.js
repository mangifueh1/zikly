import { DEMO_MODE, supabase, supabaseReady } from "../config/supabase.js";
import { demoArtist } from "./demo-data.js";

export async function getFeaturedArtists(limit = 6) {
  if (DEMO_MODE) return [demoArtist];
  await supabaseReady;
  const { data, error } = await supabase
    .from("public_artists")
    .select("id,name,slug,bio,avatar_url")
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function searchArtists(query, limit = 8) {
  const search = query.trim();
  if (!search) return [];
  if (DEMO_MODE) {
    const haystack = `${demoArtist.name} ${demoArtist.slug}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) ? [demoArtist] : [];
  }
  await supabaseReady;
  const pattern = `%${search}%`;
  const [byName, bySlug] = await Promise.all([
    supabase.from("public_artists").select("name,slug,bio,avatar_url").ilike("name", pattern).limit(limit),
    supabase.from("public_artists").select("name,slug,bio,avatar_url").ilike("slug", pattern).limit(limit),
  ]);
  if (byName.error) throw byName.error;
  if (bySlug.error) throw bySlug.error;
  const artists = new Map();
  for (const artist of [...(byName.data || []), ...(bySlug.data || [])]) artists.set(artist.slug, artist);
  return Array.from(artists.values()).slice(0, limit);
}

export async function getArtistBySlug(slug) {
  if (DEMO_MODE) return demoArtist.slug === slug ? demoArtist : null;
  await supabaseReady;
  const { data, error } = await supabase
    .from("public_artists")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateArtistProfile(artistId, changes) {
  if (DEMO_MODE) throw new Error("Connect Supabase to update your creator profile.");
  await supabaseReady;
  const { error } = await supabase.from("artists").update(changes).eq("id", artistId);
  if (error) throw error;
}

export async function getOwnedArtist(userId) {
  if (DEMO_MODE) return null;
  await supabaseReady;
  const { data, error } = await supabase.from("artists").select("*").eq("user_id", userId).single();
  if (error) throw error;
  return data;
}

export async function getFanSubscriptionForArtist(artistId) {
  if (!artistId) return null;
  const localKey = `zikly_sub_${artistId}`;
  const localExpiry = localStorage.getItem(localKey);
  const now = new Date();
  let localActive = null;
  if (localExpiry) {
    const expDate = new Date(localExpiry);
    if (expDate > now) {
      localActive = { artist_id: artistId, expires_at: expDate.toISOString() };
    } else {
      localStorage.removeItem(localKey);
    }
  }

  if (DEMO_MODE) return localActive;

  try {
    await supabaseReady;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return localActive;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id,artist_id,starts_at,expires_at")
      .eq("user_id", user.id)
      .eq("artist_id", artistId)
      .gt("expires_at", now.toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      localStorage.setItem(localKey, data.expires_at);
      return data;
    }
  } catch (err) {
    console.warn("Could not check subscription status:", err);
  }

  return localActive;
}

export function saveLocalSubscription(artistId, days = 30) {
  if (!artistId) return;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(`zikly_sub_${artistId}`, expiresAt);
  return expiresAt;
}
