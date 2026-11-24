import { DEMO_MODE, supabaseReady } from "../config/supabase.js";

export async function signUp({ email, password, role, artistName, slug }) {
  if (DEMO_MODE) throw new Error("Demo mode: connect Supabase to create an account.");
  const client = await supabaseReady;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { role, artist_name: artistName, artist_slug: slug },
      emailRedirectTo: "https://zikly.vercel.app/auth.html",
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  if (DEMO_MODE) throw new Error("Demo mode: connect Supabase to sign in.");
  const client = await supabaseReady;
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (profileError) throw profileError;
  data.role = profile.role;
  return data;
}

export async function resetPassword(email) {
  if (DEMO_MODE) throw new Error("Demo mode: connect Supabase to reset a password.");
  const client = await supabaseReady;
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/auth.html`,
  });
  if (error) throw error;
}

export async function signOut() {
  if (!DEMO_MODE) {
    const client = await supabaseReady;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }
}

export async function getCurrentProfile() {
  if (DEMO_MODE) return null;
  const client = await supabaseReady;
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;
  const { data, error } = await client.from("profiles").select("role").eq("id", sessionData.session.user.id).single();
  if (error) throw error;
  return { ...data, user: sessionData.session.user };
}

export async function updatePassword(password) {
  if (DEMO_MODE) throw new Error("Connect Supabase to update account settings.");
  const client = await supabaseReady;
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error("Sign in to update your password.");
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}
