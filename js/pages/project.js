import { DEMO_MODE } from "../config/supabase.js";
import { getProjectById, getTracksByProject } from "../services/project.service.js";
import { formatXaf, escapeHtml } from "../utils/format.js";
import { openCheckout } from "../components/checkout-modal.js";
import { mountMiniPlayer } from "../components/audio-player.js";
import { getMediaAccess } from "../services/media.service.js";
import { openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";

async function init() {
  if (DEMO_MODE) document.querySelector("#demo-banner").classList.remove("hidden");
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    document.querySelector("#project-main").innerHTML = `<div class="state">Project not found.</div>`;
    return;
  }
  try {
    const project = await getProjectById(id);
    if (!project) throw new Error("Project not found.");
    const tracks = await getTracksByProject(id);
    const projectArtImage = document.querySelector("#project-art-image");
    if (project.cover_url) {
      projectArtImage.src = project.cover_url;
      projectArtImage.alt = `${project.title} artwork`;
      projectArtImage.addEventListener("error", () => projectArtImage.remove(), { once: true });
    } else {
      projectArtImage.remove();
    }
    document.querySelector("#project-title").textContent = project.title;
    document.querySelector("#project-description").textContent = project.description || "";
    document.querySelector("#project-meta").innerHTML =
      `<span class="badge">${escapeHtml(project.category.toUpperCase())}</span><span>${tracks.length} tracks</span><span>Independent release</span>`;
    document.querySelector("#project-meta").className = "project-meta-row";
    document.querySelector("#project-unlock").innerHTML = project.is_paid
      ? `<button class="btn btn-accent" data-project-unlock>Unlock project · ${formatXaf(project.price_xaf)}</button>`
      : `<span class="badge">Free project</span>`;
    document.querySelector("#track-list").innerHTML = tracks.length ? tracks.map((track, index) => `
      <div class="track-row">
        <span class="track-number">${index + 1}</span>
        <div class="track-main">
          <h3>${escapeHtml(track.title)}</h3>
          <p>${escapeHtml(track.description || track.track_type)} · ${escapeHtml(track.duration || "")}</p>
        </div>
        ${track.is_paid
          ? `<div class="track-actions">
              <button class="btn btn-outline btn-small" type="button" data-preview="${track.id}" data-title="${escapeHtml(track.title)}" data-type="${track.track_type}" title="Preview sample">
                <i class="icon-play"></i> Glimpse
              </button>
              <button class="btn btn-secondary btn-small" type="button" data-play="${track.id}" data-title="${escapeHtml(track.title)}" data-paid="true" data-price="${track.price_xaf}">
                <i class="icon-lock-keyhole"></i> Unlock · ${formatXaf(track.price_xaf)}
              </button>
            </div>`
          : `<button class="btn btn-secondary btn-small" data-play="${track.id}" data-title="${escapeHtml(track.title)}"><i class="${track.track_type === "audio" ? "icon-play" : track.track_type === "video" ? "icon-play-square" : "icon-image"}"></i> ${track.track_type === "audio" ? "Play" : "View"}</button>`}
      </div>`).join("") : `<div class="state">No media is available in this release yet.</div>`;

    document.querySelector("[data-project-unlock]")?.addEventListener("click", () =>
      openCheckout({ title: project.title, price: project.price_xaf, targetType: "project", targetId: project.id }));

    document.querySelectorAll("[data-preview]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      const originalHtml = button.innerHTML;
      button.innerHTML = `<i class="icon-loader-circle"></i> Loading…`;
      try {
        const access = await getMediaAccess(button.dataset.preview, { preview: true });
        if (access?.url) {
          const trackType = button.dataset.type;
          const trackTitle = button.dataset.title;
          const trackId = button.dataset.preview;
          const trackObj = tracks.find((item) => item.id === trackId);
          const price = trackObj?.price_xaf || 500;
          const previewDuration = access.preview_duration || 30;

          if (trackType === "audio") {
            mountMiniPlayer(trackTitle, access.url, {
              isPreview: true,
              previewDuration,
              onPreviewEnd: () => {
                toast("Audio preview ended. Unlock to hear the full release!", "info");
                openCheckout({ title: trackTitle, price, targetType: "track", targetId: trackId });
              },
            });
          } else if (trackType === "video") {
            const media = `<video controls autoplay src="${escapeHtml(access.url)}" style="max-height:65vh;width:100%;border-radius:6px;"></video>`;
            const modal = openModal(`
              <div class="modal-header">
                <div>
                  <span class="badge" style="background:#f59e0b;color:#000;font-size:0.75rem;font-weight:600;display:inline-block;margin-bottom:4px;">30-SECOND GLIMPSE</span>
                  <h2>${escapeHtml(trackTitle)}</h2>
                </div>
                <button class="modal-close" type="button" aria-label="Close">&times;</button>
              </div>
              <div class="media-preview">${media}</div>
              <div style="padding:1rem;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);">
                <small class="muted">Sample ends in ${previewDuration}s · Unlock to watch completely</small>
                <button class="btn btn-accent btn-small" id="preview-unlock-now"><i class="icon-lock-keyhole"></i> Unlock full video · ${formatXaf(price)}</button>
              </div>
            `);
            const videoEl = modal.backdrop.querySelector("video");
            const onTime = () => {
              if (videoEl.currentTime >= previewDuration) {
                videoEl.pause();
                videoEl.removeEventListener("timeupdate", onTime);
                modal.close();
                toast("Video glimpse ended. Unlock to watch completely!", "info");
                openCheckout({ title: trackTitle, price, targetType: "track", targetId: trackId });
              }
            };
            videoEl.addEventListener("timeupdate", onTime);
            modal.backdrop.querySelector(".modal-close").addEventListener("click", modal.close);
            modal.backdrop.querySelector("#preview-unlock-now").addEventListener("click", () => {
              modal.close();
              openCheckout({ title: trackTitle, price, targetType: "track", targetId: trackId });
            });
          } else {
            const media = `<img src="${escapeHtml(access.url)}" alt="${escapeHtml(trackTitle)}" style="max-height:65vh;object-fit:contain;filter:blur(3px);">`;
            const modal = openModal(`
              <div class="modal-header">
                <div>
                  <span class="badge" style="background:#f59e0b;color:#000;font-size:0.75rem;font-weight:600;display:inline-block;margin-bottom:4px;">PREVIEW</span>
                  <h2>${escapeHtml(trackTitle)}</h2>
                </div>
                <button class="modal-close" type="button" aria-label="Close">&times;</button>
              </div>
              <div class="media-preview">${media}</div>
              <div style="padding:1rem;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);">
                <small class="muted">Blurred preview · Unlock for full unblurred image</small>
                <button class="btn btn-accent btn-small" id="preview-unlock-now"><i class="icon-lock-keyhole"></i> Unlock · ${formatXaf(price)}</button>
              </div>
            `);
            modal.backdrop.querySelector(".modal-close").addEventListener("click", modal.close);
            modal.backdrop.querySelector("#preview-unlock-now").addEventListener("click", () => {
              modal.close();
              openCheckout({ title: trackTitle, price, targetType: "track", targetId: trackId });
            });
          }
          return;
        }
        throw new Error("No playable preview URL was returned. Check that the track has an uploaded file and is published.");
      } catch (err) {
        toast(err.message || "Preview unavailable.", "error");
      } finally {
        button.disabled = false;
        button.innerHTML = originalHtml;
      }
    }));

    document.querySelectorAll("[data-play]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const access = await getMediaAccess(button.dataset.play);
        if (access?.url) {
          const track = tracks.find((item) => item.id === button.dataset.play);
          if (track?.track_type === "audio") {
            mountMiniPlayer(button.dataset.title, access.url);
          } else {
            const media = track?.track_type === "video"
              ? `<video controls autoplay src="${escapeHtml(access.url)}"></video>`
              : `<img src="${escapeHtml(access.url)}" alt="${escapeHtml(button.dataset.title)}">`;
            const modal = openModal(`<div class="modal-header"><h2>${escapeHtml(button.dataset.title)}</h2><button class="modal-close" type="button" aria-label="Close">&times;</button></div><div class="media-preview">${media}</div>`);
            modal.backdrop.querySelector(".modal-close").addEventListener("click", modal.close);
          }
          return;
        }
        throw new Error("Media access is unavailable.");
      } catch (error) {
        const status = error.status || error.context?.status;
        if (button.dataset.paid === "true" && status === 403) {
          openCheckout({ title: button.dataset.title, price: Number(button.dataset.price), targetType: "track", targetId: button.dataset.play });
        } else if (status === 401) {
          toast("Sign in with a Fan account to access this media.", "error");
        } else {
          toast(error.message, "error");
        }
      } finally {
        button.disabled = false;
      }
    }));
  } catch (error) {
    toast(error.message, "error");
    document.querySelector("#project-main").innerHTML =
      `<div class="state">Unable to load this release. ${escapeHtml(error.message)}</div>`;
  }
}

init();
