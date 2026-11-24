import { DEMO_MODE } from "../config/supabase.js";
import { getArtistBySlug } from "../services/artist.service.js";
import { getProjectsByArtist } from "../services/project.service.js";
import { projectCard } from "../components/project-card.js";
import { categoryTabs } from "../components/category-tabs.js";
import { formatXaf, escapeHtml } from "../utils/format.js";
import { toast } from "../components/toast.js";
import { openCheckout } from "../components/checkout-modal.js";

const params = new URLSearchParams(location.search);
const slug = params.get("artist") || "maya-nse";
let projects = [];

async function init() {
  if (DEMO_MODE) document.querySelector("#demo-banner").classList.remove("hidden");
  try {
    const artist = await getArtistBySlug(slug);
    if (!artist) {
      document.querySelector("#artist-main").innerHTML = `<div class="state">Artist not found.</div>`;
      return;
    }
    document.querySelector("#artist-name").textContent = artist.name;
    document.querySelector("#artist-bio").textContent = artist.bio || "";
    const avatarImage = document.querySelector(".artist-avatar-image");
    if (artist.avatar_url) {
      avatarImage.src = artist.avatar_url;
      avatarImage.alt = artist.name;
      avatarImage.addEventListener("error", () => avatarImage.remove(), { once: true });
    } else {
      avatarImage.remove();
    }
    const coverImage = document.querySelector(".artist-cover-image");
    if (artist.cover_url) {
      coverImage.src = artist.cover_url;
      coverImage.alt = "";
      coverImage.addEventListener("error", () => coverImage.remove(), { once: true });
    } else {
      coverImage.remove();
    }
    if (artist.subscription_price_xaf) {
      const card = document.querySelector("#subscription-card");
      card.classList.remove("hidden");
      card.innerHTML = `<div><span class="eyebrow">Support this creator</span><h2>Become a subscriber</h2>
        <p>Get access to ${escapeHtml(artist.name)}'s exclusive releases for 30 days.</p>
        <strong>${formatXaf(artist.subscription_price_xaf)} <small>one-time · 30 days</small></strong></div>
        <button class="btn" type="button" id="subscribe-button"><i class="icon-heart-handshake"></i> Subscribe</button>`;
      card.querySelector("#subscribe-button").addEventListener("click", () => openCheckout({
        title: `${artist.name} subscription`,
        price: artist.subscription_price_xaf,
        targetType: "subscription",
        targetId: artist.id,
      }));
    }
    const socials = Object.entries(artist.social_links || {})
      .filter(([, url]) => typeof url === "string" && /^https?:\/\//i.test(url))
      .map(([network, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><i class="${network === "instagram" ? "icon-instagram" : network === "youtube" ? "icon-youtube" : "icon-external-link"}"></i>${escapeHtml(network)}</a>`);
    if (socials.length) {
      const socialSection = document.querySelector("#artist-social-links");
      socialSection.classList.remove("hidden");
      socialSection.innerHTML = socials.join("");
    }
    projects = await getProjectsByArtist(artist.id);
    renderProjects("all");
  } catch (error) {
    toast(error.message, "error");
    document.querySelector("#projects").innerHTML =
      `<div class="state">Unable to load this creator profile. ${escapeHtml(error.message)}</div>`;
  }
}

function renderProjects(category) {
  const visible = category === "all" ? projects : projects.filter((project) => project.category === category);
  document.querySelector("#category-tabs").innerHTML = categoryTabs(category);
  document.querySelector("#projects").innerHTML = visible.length
    ? visible.map(projectCard).join("")
    : `<div class="state">No published ${escapeHtml(category === "all" ? "content" : category)} yet.</div>`;
  document.querySelectorAll("[data-category]").forEach((tab) => {
    tab.addEventListener("click", () => renderProjects(tab.dataset.category));
  });
}

document.querySelector("#share-profile")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("Profile link copied.", "success");
  } catch {
    toast("Copy the URL from your browser.", "error");
  }
});

init();
