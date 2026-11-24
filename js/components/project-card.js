import { escapeHtml } from "../utils/format.js";

export function projectCard(project, options) {
  const isExclusive = project.is_paid || project.has_exclusive;
  const label = isExclusive ? "Exclusive" : "Free";
  const artistName = project.artist_name || "Independent artist";
  const actionLabel = options && typeof options === "object" ? options.actionLabel || "Explore" : "Explore";
  const cover = project.cover_url
    ? `<img src="${escapeHtml(project.cover_url)}" alt="${escapeHtml(project.title)} artwork" loading="lazy" decoding="async" onerror="this.remove()">`
    : "";
  const price = project.is_paid
    ? `<strong>${new Intl.NumberFormat("en-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(project.price_xaf)}</strong>`
    : `<strong class="project-action-label">${project.has_exclusive ? escapeHtml(actionLabel) : "Listen"}</strong>`;
  return `
    <a class="project-card" href="project.html?id=${encodeURIComponent(project.id)}">
      <div class="project-cover" aria-label="${escapeHtml(project.title)} artwork">
        <i class="icon-disc-3"></i>
        ${cover}
      </div>
      <div class="project-card-body">
        <h3>${escapeHtml(project.title)}</h3>
        <span class="project-card-artist">${escapeHtml(artistName)}</span>
        <div class="project-card-meta">
          <span class="badge ${isExclusive ? "exclusive" : ""}">${label}</span>
          ${price}
        </div>
      </div>
    </a>`;
}
