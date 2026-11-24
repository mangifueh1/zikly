import { DEMO_MODE, supabase, supabaseReady } from "../config/supabase.js";

export async function getMediaAccess(trackId, { preview = false, download = false } = {}) {
  if (DEMO_MODE) return null;
  await supabaseReady;
  const { data, error } = await supabase.functions.invoke("get-media-access", {
    body: { track_id: trackId, preview, download },
  });
  if (error) {
    let message = error.message || "Unable to access this media.";
    if (error.context?.clone) {
      try {
        const body = await error.context.clone().json();
        message = body.error || message;
      } catch {
        // The function may return a non-JSON error body.
      }
    }
    const result = new Error(message);
    result.status = error.context?.status;
    throw result;
  }
  return data;
}
