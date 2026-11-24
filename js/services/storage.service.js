import { DEMO_MODE, supabase, supabaseReady, supabaseUrl, supabaseAnonKey } from "../config/supabase.js";

export async function uploadMedia(artistId, projectId, file, onProgress = () => {}) {
  if (DEMO_MODE) throw new Error("Connect Supabase Storage to upload media.");
  await supabaseReady;
  const allowedTypes = [
    "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/flac", "audio/wav",
    "video/mp4", "video/webm", "image/jpeg", "image/png", "image/webp",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose an audio, video, JPEG, PNG, or WebP file.");
  }
  if (file.size > 100 * 1024 * 1024) throw new Error("Media file exceeds the 100 MB limit.");
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const path = `${artistId}/${projectId}/${Date.now()}-${safeName}`;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error("Sign in again before uploading media.");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/zikly-audio/${encodedPath}`);
    request.setRequestHeader("Authorization", `Bearer ${sessionData.session.access_token}`);
    request.setRequestHeader("apikey", supabaseAnonKey);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      let message = "Media upload failed.";
      try {
        const payload = JSON.parse(request.responseText);
        message = payload.message || payload.error || message;
      } catch {
        // Keep the generic message when Storage returns a non-JSON response.
      }
      console.error("Storage upload failed:", request.status, request.responseText);
      reject(new Error(message));
    });
    request.addEventListener("error", () => reject(new Error("Media upload failed due to a network error.")));
    request.addEventListener("abort", () => reject(new Error("Media upload was cancelled.")));
    request.send(file);
  });
  return path;
}

export async function uploadImageAsDataUrl(file, maxDimension = 1200) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Please select a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to process image file."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function deleteMedia(path) {
  if (DEMO_MODE || !path) return;
  await supabaseReady;
  const { error } = await supabase.storage.from("zikly-audio").remove([path]);
  if (error) throw error;
}
