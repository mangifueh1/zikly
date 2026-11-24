import { DEMO_MODE, supabaseReady, supabase } from "../config/supabase.js";

export async function getFanVault() {
  if (DEMO_MODE) return { items: [], subscriptions: [] };
  await supabaseReady;
  const { data, error } = await supabase.functions.invoke("get-fan-vault", {
    body: {},
  });
  if (error) throw error;
  return data;
}
