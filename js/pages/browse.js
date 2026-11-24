import { DEMO_MODE } from "../config/supabase.js";
import { searchArtists } from "../services/artist.service.js";
import { searchProjects } from "../services/project.service.js";
import { projectCard } from "../components/project-card.js";
import { escapeHtml } from "../utils/format.js";

const page = document.querySelector("[data-browse-type]");
const input = document.querySelector("#browse-search");
const results = document.querySelector("#browse-results");
const type = page.dataset.browseType;

if (DEMO_MODE) document.querySelector("#demo-banner").classList.remove("hidden");

function renderArtists(artists) {
  if (!artists.length) return `<div class="state">No creators found. Try another search.</div>`;
  return artists.map((artist) => `
    <article class="artist-card">
      <div class="artist-avatar">
        ${artist.avatar_url
          ? `<img src="${escapeHtml(artist.avatar_url)}" alt="${escapeHtml(artist.name)}" loading="lazy" decoding="async" onerror="this.remove()">`
          : ""}
      </div>
      <div><h3>${escapeHtml(artist.name)}</h3><p>${escapeHtml(artist.bio || "")}</p></div>
      <a class="artist-profile-link" href="artist.html?artist=${encodeURIComponent(artist.slug)}">
        <span>View profile</span>
        <i class="icon-arrow-up-right" aria-hidden="true"></i>
      </a>
    </article>`).join("");
}

let timer;
let requestId = 0;
input.addEventListener("input", () => {
  clearTimeout(timer);
  const query = input.value.trim();
  const request = ++requestId;
  if (!query) {
    results.innerHTML = `<div class="state">Start typing to search ${type}.</div>`;
    return;
  }
  results.innerHTML = `<div class="state">Searching...</div>`;
  timer = setTimeout(async () => {
    try {
      const items = type === "creators" ? await searchArtists(query) : await searchProjects(query);
      if (request !== requestId) return;
      results.innerHTML = items.length
        ? type === "creators" ? renderArtists(items) : items.map(projectCard).join("")
        : `<div class="state">No ${type} found. Try another search.</div>`;
    } catch (error) {
      if (request !== requestId) return;
      results.innerHTML = `<div class="state">Unable to search ${type}: ${escapeHtml(error.message)}</div>`;
    }
  }, 180);
});
