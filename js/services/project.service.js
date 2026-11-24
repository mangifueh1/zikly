import { DEMO_MODE, supabase, supabaseReady } from "../config/supabase.js";
import { demoProjects, demoTracks } from "./demo-data.js";

function demoProjectCards(projects) {
  return projects.map((project) => ({
    ...project,
    has_exclusive: demoTracks.some((track) => track.project_id === project.id && track.is_paid),
  }));
}

export async function getFeaturedProjects(limit = 6) {
  if (DEMO_MODE) return demoProjectCards(demoProjects.filter((project) => project.is_published)).map((project) => ({ ...project, artist_name: "Maya Nse" }));
  await supabaseReady;
  const { data, error } = await supabase
    .from("public_projects")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function searchProjects(query, limit = 12) {
  const search = query.trim();
  if (!search) return [];
  if (DEMO_MODE) {
    return demoProjectCards(demoProjects.filter((project) =>
      project.is_published && project.title.toLowerCase().includes(search.toLowerCase())
    )).map((project) => ({ ...project, artist_name: "Maya Nse" })).slice(0, limit);
  }
  await supabaseReady;
  const { data, error } = await supabase
    .from("public_projects")
    .select("*")
    .eq("is_published", true)
    .ilike("title", `%${search}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getProjectsByArtist(artistId) {
  if (DEMO_MODE) return demoProjectCards(demoProjects.filter((project) => project.artist_id === artistId));
  await supabaseReady;
  const { data, error } = await supabase
    .from("public_projects")
    .select("*")
    .eq("artist_id", artistId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProjectById(projectId) {
  if (DEMO_MODE) return demoProjectCards(demoProjects.filter((project) => project.id === projectId))[0] || null;
  await supabaseReady;
  const { data, error } = await supabase
    .from("public_projects")
    .select("*")
    .eq("id", projectId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTracksByProject(projectId) {
  if (DEMO_MODE) return demoTracks.filter((track) => track.project_id === projectId);
  await supabaseReady;
  const { data, error } = await supabase
    .from("public_tracks")
    .select("id,project_id,title,description,track_type,is_paid,price_xaf,duration,position,created_at")
    .eq("project_id", projectId)
    .order("position");
  if (error) throw error;
  return data;
}

export async function createProject(project) {
  if (DEMO_MODE) throw new Error("Connect Supabase to create projects.");
  await supabaseReady;
  const { data, error } = await supabase.from("projects").insert(project).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateProject(projectId, changes) {
  if (DEMO_MODE) throw new Error("Connect Supabase to update projects.");
  await supabaseReady;
  const { data, error } = await supabase
    .from("projects")
    .update(changes)
    .eq("id", projectId)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(projectId) {
  if (DEMO_MODE) throw new Error("Connect Supabase to delete projects.");
  await supabaseReady;
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function getOwnedProjects(artistId) {
  if (DEMO_MODE) return [];
  await supabaseReady;
  const { data, error } = await supabase.from("projects").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
