import { DEMO_MODE } from "../config/supabase.js";
import { demoArtist, demoProjects } from "../services/demo-data.js";
import { projectCard } from "../components/project-card.js";
import { getFeaturedArtists, searchArtists } from "../services/artist.service.js";
import { getFeaturedProjects } from "../services/project.service.js";
import { escapeHtml } from "../utils/format.js";

const searchInput = document.querySelector("#artist-search");
const searchResults = document.querySelector("#search-results");

if (DEMO_MODE) document.querySelector("#demo-banner").classList.remove("hidden");

async function initDiscovery() {
  const projectList = document.querySelector("#featured-project-list");
  try {
    const projects = DEMO_MODE
      ? demoProjects.map((project) => ({ ...project, artist_name: demoArtist.name }))
      : await getFeaturedProjects();
    projectList.innerHTML = projects.length
      ? projects.map((project) => projectCard(project, { actionLabel: "More" })).join("")
      : `<div class="state">No published projects yet.</div>`;
  } catch {
    projectList.innerHTML = `<div class="state">Unable to load projects.</div>`;
  }

  const artistList = document.querySelector("#featured-artist-list");
  try {
    const rawArtists = await getFeaturedArtists();
    const artists = rawArtists
      .filter((artist) => {
        const name = (artist.name || "").trim().toLowerCase();
        const slug = (artist.slug || "").trim().toLowerCase();
        return name !== "test artist" && !name.startsWith("test ") && slug !== "test-artist";
      })
      .slice(0, 3);
    artistList.innerHTML = artists.length
      ? artists.map((artist) => `
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
      </article>`).join("")
      : `<div class="artist-empty state">
          <i class="icon-users" aria-hidden="true"></i>
          <strong>No featured creators yet</strong>
          <span>New independent creators will appear here soon.</span>
          <a class="artist-empty-link" href="auth.html">Become a creator</a>
        </div>`;
  } catch {
    artistList.innerHTML = `<div class="state">Unable to load featured creators.</div>`;
  }
}

initDiscovery();

let searchTimer;
let searchRequest = 0;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const request = ++searchRequest;
  const query = searchInput.value;
  if (!query.trim()) {
    searchResults.classList.add("hidden");
    return;
  }
  searchTimer = setTimeout(async () => {
    try {
      const artists = await searchArtists(query);
      if (request !== searchRequest) return;
      if (!artists.length) {
        searchResults.innerHTML = `<div class="search-result">No artists found</div>`;
      } else {
        searchResults.innerHTML = artists.map((artist) => `
          <a class="search-result" href="artist.html?artist=${encodeURIComponent(artist.slug)}">
            <span class="search-avatar">
              ${artist.avatar_url
                ? `<img src="${escapeHtml(artist.avatar_url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
                : escapeHtml(artist.name.slice(0, 1).toUpperCase())}
            </span>
            <span><strong>${escapeHtml(artist.name)}</strong><br><small>@${escapeHtml(artist.slug)}</small></span>
          </a>`).join("");
      }
      searchResults.classList.remove("hidden");
    } catch (error) {
      if (request !== searchRequest) return;
      searchResults.innerHTML = `<div class="search-result">${escapeHtml(error.message)}</div>`;
      searchResults.classList.remove("hidden");
    }
  }, 180);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) searchResults.classList.add("hidden");
});

