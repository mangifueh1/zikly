export const supabaseUrl = window.ZIKLY_CONFIG?.supabaseUrl ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://epsuarukzljbnlheogqu.supabase.co";
export const supabaseAnonKey = window.ZIKLY_CONFIG?.supabaseAnonKey ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  "sb_publishable_5_h2-7eJ83s6o_K-0ZeF_w_O1HybV5m";

export const DEMO_MODE = !supabaseUrl || !supabaseAnonKey ||
  window.ZIKLY_CONFIG?.demoMode === true;

export let supabase = null;
let resolveReady;
let rejectReady;
export const supabaseReady = new Promise((resolve, reject) => {
  resolveReady = resolve;
  rejectReady = reject;
});

if (!DEMO_MODE) {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = () => {
    try {
      supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      resolveReady(supabase);
    } catch (error) {
      rejectReady(error);
    }
  };
  script.onerror = () => rejectReady(new Error("Supabase could not be loaded."));
  document.head.appendChild(script);
} else {
  resolveReady(null);
}
