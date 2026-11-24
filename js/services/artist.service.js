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
