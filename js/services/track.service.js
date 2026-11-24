import { DEMO_MODE, supabase, supabaseReady } from "../config/supabase.js";

export async function createTrack(track) {
  if (DEMO_MODE) throw new Error("Connect Supabase to create tracks.");
  await supabaseReady;
  const { data, error } = await supabase.from("tracks").insert(track).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateTrack(trackId, changes) {
  if (DEMO_MODE) throw new Error("Connect Supabase to update tracks.");
  await supabaseReady;
  const { data, error } = await supabase.from("tracks").update(changes).eq("id", trackId).select("id").single();
  if (error) throw error;
  return data;
}

export async function deleteTrack(trackId) {
  if (DEMO_MODE) throw new Error("Connect Supabase to delete tracks.");
  await supabaseReady;
  const { error } = await supabase.from("tracks").delete().eq("id", trackId);
  if (error) throw error;
}

export async function getOwnedTracks(projectIds) {
  if (DEMO_MODE || !projectIds.length) return [];
  await supabaseReady;
  const { data, error } = await supabase.from("tracks")
    .select("id,project_id,title,description,track_type,is_paid,price_xaf,audio_path,media_path,created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
