import { escapeHtml } from "../utils/format.js";

export function mountMiniPlayer(title, src, options = {}) {
  const { isPreview = false, previewDuration = 30, onPreviewEnd } = options;
  let player = document.querySelector(".mini-player");
  if (!player) {
    player = document.createElement("div");
    player.className = "mini-player";
    document.body.appendChild(player);
  }
  player.innerHTML = `
    <div class="mini-player-title">
      ${escapeHtml(title)}
      ${isPreview ? `<span class="badge" style="background:#f59e0b;color:#000;font-size:0.7rem;padding:2px 6px;border-radius:4px;margin-left:8px;font-weight:600;">PREVIEW (30s)</span>` : ""}
    </div>
    <audio controls autoplay src="${escapeHtml(src || "")}" aria-label="Now playing ${escapeHtml(title)}"></audio>
    <button class="icon-button mini-player-close" type="button" aria-label="Close player"><i class="icon-x"></i></button>`;

  const audio = player.querySelector("audio");
  if (isPreview && audio) {
    const handleTimeUpdate = () => {
      if (audio.currentTime >= previewDuration) {
        audio.pause();
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        if (typeof onPreviewEnd === "function") {
          onPreviewEnd();
        }
      }
    };
    audio.addEventListener("timeupdate", handleTimeUpdate);
  }

  player.querySelector(".mini-player-close").addEventListener("click", () => player.remove());
  return player;
}
