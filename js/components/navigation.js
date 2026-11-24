import { getCurrentProfile, signOut } from "../services/auth.service.js";
import { getOwnedArtist } from "../services/artist.service.js";
import { toast } from "./toast.js";
import { setupMobileNavigation } from "./mobile-navigation.js";

const nav = document.querySelector(".main-nav");
setupMobileNavigation();

async function initNavigation() {
  if (!nav) return;
  try {
    const profile = await getCurrentProfile();
    let markup;
    if (profile?.role === "creator") {
      const artist = await getOwnedArtist(profile.user.id);
      markup = `
        <a class="nav-link" href="artist.html?artist=${encodeURIComponent(artist.slug)}">My Profile</a>
        <a class="nav-link" href="dashboard.html">Dashboard</a>
        <a class="nav-link" href="dashboard.html?section=media">Manage Media</a>
        <a class="nav-link" href="account.html">Account Settings</a>
        <button class="nav-link nav-button" type="button" data-logout>Log out</button>`;
    } else if (profile?.role === "fan") {
      markup = `
        <a class="nav-link" href="index.html#discover">Discover</a>
        <a class="nav-link" href="projects.html">Explore Projects</a>
        <a class="nav-link" href="creators.html">Explore Creators</a>
        <a class="nav-link" href="vault.html">My Vault</a>
        <a class="nav-link" href="account.html">Account Settings</a>
        <button class="nav-link nav-button" type="button" data-logout>Log out</button>`;
    } else {
      markup = `
        <a class="nav-link" href="index.html#discover">Discover</a>
        <a class="nav-link" href="projects.html">Explore Projects</a>
        <a class="nav-link" href="creators.html">Explore Creators</a>
        <a class="btn btn-small" href="auth.html">Sign in / Join</a>`;
    }
    nav.innerHTML = markup;
    nav.querySelector("[data-logout]")?.addEventListener("click", async () => {
      const button = nav.querySelector("[data-logout]");
      button.disabled = true;
      try {
        await signOut();
        location.href = "index.html";
      } catch (error) {
        button.disabled = false;
        toast(error.message, "error");
      }
    });
  } catch (error) {
    toast(error.message || "Navigation could not load your account.", "error");
  }
}

initNavigation();
