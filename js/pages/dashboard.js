import { DEMO_MODE, supabase, supabaseReady } from "../config/supabase.js";
import { getCurrentProfile, signOut } from "../services/auth.service.js";
import { getOwnedArtist, updateArtistProfile } from "../services/artist.service.js";
import { getOwnedProjects, createProject, updateProject, deleteProject } from "../services/project.service.js";
import { getOwnedTracks, createTrack, deleteTrack } from "../services/track.service.js";
import { uploadMedia, deleteMedia, uploadImageAsDataUrl } from "../services/storage.service.js";
import { formatXaf, escapeHtml } from "../utils/format.js";
import { toast } from "../components/toast.js";
import { setupMobileNavigation } from "../components/mobile-navigation.js";

setupMobileNavigation();
const section = document.querySelector("#dashboard-section");
let artist;
let profile;
let projects = [];

function formatErrorMessage(error) {
  const msg = (error?.message || "").toLowerCase();
  const details = (error?.details || "").toLowerCase();
  if (
    msg.includes("foreign key") ||
    details.includes("foreign key") ||
    msg.includes("active purchases") ||
    msg.includes("violates foreign key constraint") ||
    msg.includes("unlocks_project_id_fkey") ||
    msg.includes("unlocks_track_id_fkey") ||
    msg.includes("payments_project_id_fkey") ||
    msg.includes("payments_track_id_fkey")
  ) {
    return "This project or media cannot be deleted because fans have already purchased or unlocked it. Active purchases are protected so fans retain access.";
  }
  return error?.message || "Something went wrong.";
}

function showError(error) {
  toast(formatErrorMessage(error), "error");
}

function setLoading(message) {
  section.innerHTML = `<div class="state" role="status">${escapeHtml(message)}</div>`;
}

async function overview() {
  setLoading("Loading your creator overview…");
  const [{ data: payments, error: paymentError }, { data: unlocks, error: unlockError }, { data: subscribers, error: subscriberError }] = await Promise.all([
    supabase.from("payments").select("id,status,amount_xaf,payment_type,created_at").eq("artist_id", artist.id).order("created_at", { ascending: false }),
    supabase.from("unlocks").select("id").eq("artist_id", artist.id),
    supabase.from("subscriptions").select("user_id,expires_at").eq("artist_id", artist.id).gt("expires_at", new Date().toISOString()),
  ]);
  if (paymentError) throw paymentError;
  if (unlockError) throw unlockError;
  if (subscriberError) throw subscriberError;
  const successful = payments.filter((payment) => payment.status === "SUCCESS");
  const earnings = successful.reduce((total, payment) => total + payment.amount_xaf, 0);
  const activeFans = new Set(subscribers.map((item) => item.user_id)).size;
  section.innerHTML = `
    <div class="dashboard-title"><div><span class="eyebrow">Creator studio</span><h1>Overview</h1></div>
      <a class="btn btn-small" href="artist.html?artist=${encodeURIComponent(artist.slug)}"><i class="icon-external-link"></i> View profile</a></div>
    <div class="stat-grid">
      <article class="stat-card"><span><i class="icon-banknote"></i> Earnings</span><strong>${formatXaf(earnings)}</strong><small>Confirmed payments</small></article>
      <article class="stat-card"><span><i class="icon-unlock"></i> Media sold</span><strong>${unlocks.length}</strong><small>Confirmed unlocks</small></article>
      <article class="stat-card"><span><i class="icon-users-round"></i> Active subscribers</span><strong>${activeFans}</strong><small>Currently active</small></article>
    </div>
    <div class="table-wrap">
      <div class="table-heading"><h2>Recent activity</h2><span>Latest payment updates</span></div>
      <table><thead><tr><th>Activity</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>
      ${payments.length ? payments.slice(0, 8).map((payment) => `<tr>
        <td>${payment.payment_type === "subscription" ? "Creator subscription" : "Media purchase"}</td>
        <td>${formatXaf(payment.amount_xaf)}</td>
        <td><span class="badge ${payment.status === "SUCCESS" ? "" : "locked"}">${escapeHtml(payment.status.toLowerCase())}</span></td>
        <td>${escapeHtml(new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(payment.created_at)))}</td>
      </tr>`).join("") : `<tr><td class="empty-cell" colspan="4">No transactions yet. Confirmed purchases will appear here.</td></tr>`}
      </tbody></table>
    </div>`;
}

async function mediaList() {
  setLoading("Loading your published media…");
  projects = await getOwnedProjects(artist.id);
  const tracks = await getOwnedTracks(projects.map((project) => project.id));
  section.innerHTML = `
    <div class="dashboard-title"><div><span class="eyebrow">Your catalog</span><h1>Manage media</h1></div>
      <button class="btn btn-small" type="button" data-open-upload><i class="icon-plus"></i> Add media</button></div>
    ${tracks.length ? `<div class="media-list">${tracks.map((track) => {
      const project = projects.find((item) => item.id === track.project_id);
      return `<article class="media-row">
        <div class="media-type-icon"><i class="${track.track_type === "audio" ? "icon-audio-lines" : track.track_type === "video" ? "icon-clapperboard" : "icon-image"}"></i></div>
        <div class="media-row-info"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(project?.category || "")} · ${track.is_paid ? `Exclusive · ${formatXaf(track.price_xaf)}` : "Free"}</span></div>
        <button class="btn btn-outline btn-small" type="button" data-delete-track="${track.id}" aria-label="Delete ${escapeHtml(track.title)}"><i class="icon-trash-2"></i> Delete</button>
      </article>`;
    }).join("")}</div>` : `<div class="state"><i class="icon-library"></i><strong>No media published yet</strong><span>Upload your first audio, video, or image to get started.</span></div>`}`;

  section.querySelector("[data-open-upload]")?.addEventListener("click", uploadForm);
  section.querySelectorAll("[data-delete-track]").forEach((button) => {
    button.addEventListener("click", async () => {
      const track = tracks.find((item) => item.id === button.dataset.deleteTrack);
      if (!track || !window.confirm(`Delete "${track.title}"? This cannot be undone.`)) return;
      button.disabled = true;
      try {
        await deleteTrack(track.id);
        const path = track.media_path || track.audio_path;
        if (path) await deleteMedia(path);
        const remaining = await getOwnedTracks([track.project_id]);
        if (!remaining.length) await deleteProject(track.project_id);
        toast("Media deleted.", "success");
        await mediaList();
      } catch (error) {
        button.disabled = false;
        showError(error);
      }
    });
  });
}

function uploadForm() {
  section.innerHTML = `
    <div class="dashboard-title"><div><span class="eyebrow">Creator tools</span><h1>Upload media</h1></div>
      <button class="btn btn-outline btn-small" type="button" data-cancel-upload><i class="icon-arrow-left"></i> Back to media</button></div>
    <form id="media-form" class="auth-card form-stack">
      <div class="field"><label for="media-title">Title</label><input id="media-title" name="title" maxlength="120" required></div>
      <div class="field"><label for="media-description">Description</label><textarea id="media-description" name="description" rows="3" maxlength="1000"></textarea></div>
      <div class="field"><label for="media-type">Media type</label>
        <select id="media-type" name="type"><option value="audio">Audio</option><option value="video">Video</option><option value="image">Image</option></select></div>
      <div class="field"><label for="media-file">Choose file</label><input id="media-file" name="file" type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/flac,audio/wav" required>
        <small>Maximum file size: 100 MB. Supported formats: MP3, MP4/M4A/AAC, OGG, FLAC, WAV, MP4/WebM video, JPEG, PNG, and WebP.</small></div>
      
      <div class="field">
        <label for="project-cover-file">Project cover picture (Optional)</label>
        <input id="project-cover-file" name="cover_file" type="file" accept="image/jpeg,image/png,image/webp">
        <div id="project-cover-preview" class="upload-image-preview hidden">
          <img src="" alt="Project cover preview">
          <button type="button" class="btn btn-outline btn-small remove-preview-btn"><i class="icon-x"></i> Remove</button>
        </div>
        <small>Upload artwork for your project release. Max 5 MB.</small>
      </div>

      <div class="field"><label for="media-category">Category</label>
        <select id="media-category" name="category"><option value="single">Single</option><option value="ep">EP</option><option value="visual">Visual</option><option value="vault_extra">Vault extra</option></select></div>
      <div class="field"><label for="media-access">Access</label>
        <select id="media-access" name="access"><option value="free">Free</option><option value="exclusive">Exclusive purchase</option></select></div>
      <div class="field hidden" id="price-field"><label for="media-price">Price (XAF)</label><input id="media-price" name="price" type="number" min="100" step="50" value="500"></div>
      <button class="btn" type="submit"><i class="icon-upload"></i> Publish media</button>
      <progress class="upload-progress hidden" id="upload-progress" max="100" value="0" aria-label="Upload progress"></progress>
      <p class="form-feedback hidden" id="upload-status" role="status"></p>
    </form>`;
  const form = section.querySelector("#media-form");
  const typeInput = form.elements.type;
  const fileInput = form.elements.file;
  const coverFileInput = form.elements.cover_file;
  const coverPreview = section.querySelector("#project-cover-preview");
  let coverDataUrl = null;

  coverFileInput.addEventListener("change", async () => {
    const file = coverFileInput.files[0];
    if (!file) return;
    try {
      coverDataUrl = await uploadImageAsDataUrl(file, 900);
      coverPreview.querySelector("img").src = coverDataUrl;
      coverPreview.classList.remove("hidden");
    } catch (err) {
      toast(err.message, "error");
      coverFileInput.value = "";
    }
  });

  coverPreview.querySelector(".remove-preview-btn").addEventListener("click", () => {
    coverDataUrl = null;
    coverFileInput.value = "";
    coverPreview.classList.add("hidden");
    coverPreview.querySelector("img").src = "";
  });

  typeInput.addEventListener("change", () => {
    fileInput.accept = typeInput.value === "audio"
      ? "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/flac,audio/wav"
      : typeInput.value === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp";
  });
  form.elements.access.addEventListener("change", () => {
    section.querySelector("#price-field").classList.toggle("hidden", form.elements.access.value !== "exclusive");
    form.elements.price.required = form.elements.access.value === "exclusive";
  });
  section.querySelector("[data-cancel-upload]").addEventListener("click", () => mediaList().catch(showError));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;
    const isPaid = form.elements.access.value === "exclusive";
    const price = isPaid ? Number(form.elements.price.value) : null;
    if (isPaid && (!Number.isInteger(price) || price < 100)) {
      toast("Set an exclusive price of at least 100 XAF.", "error");
      return;
    }
    const validMime = typeInput.value === "audio"
      ? ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/flac", "audio/wav"].includes(file.type)
      : typeInput.value === "video"
        ? ["video/mp4", "video/webm"].includes(file.type)
        : ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!validMime || file.size > 100 * 1024 * 1024) {
      toast("Choose a supported file type under 100 MB.", "error");
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    const feedback = form.querySelector("#upload-status");
    submit.disabled = true;
    submit.innerHTML = `<i class="icon-loader-circle"></i> Uploading…`;
    feedback.textContent = "Creating your release and securely uploading your file.";
    feedback.classList.remove("hidden");
    const progress = form.querySelector("#upload-progress");
    progress.classList.remove("hidden");
    let project;
    let path;
    let createdTrack;
    try {
      project = await createProject({
        artist_id: artist.id,
        title: form.elements.title.value.trim(),
        description: form.elements.description.value.trim(),
        category: form.elements.category.value,
        cover_url: coverDataUrl || null,
        is_paid: false,
        price_xaf: null,
        is_published: false,
      });
      path = await uploadMedia(artist.id, project.id, file, (percent) => {
        progress.value = percent;
        feedback.textContent = `Uploading securely… ${percent}%`;
      });
      const track = {
        project_id: project.id,
        title: form.elements.title.value.trim(),
        description: form.elements.description.value.trim(),
        track_type: typeInput.value,
        is_paid: isPaid,
        price_xaf: price,
        media_path: path,
        position: 0,
      };
      if (typeInput.value === "audio") track.audio_path = path;
      createdTrack = await createTrack(track);
      await updateProject(project.id, { is_published: true });
    } catch (error) {
      const cleanupErrors = [];
      if (createdTrack?.id) {
        try { await deleteTrack(createdTrack.id); } catch (cleanupError) { cleanupErrors.push(cleanupError.message); }
      }
      if (path) {
        try { await deleteMedia(path); } catch (cleanupError) { cleanupErrors.push(cleanupError.message); }
      }
      if (project?.id) {
        try { await deleteProject(project.id); } catch (cleanupError) { cleanupErrors.push(cleanupError.message); }
      }
      submit.disabled = false;
      submit.innerHTML = `<i class="icon-upload"></i> Publish media`;
      feedback.textContent = cleanupErrors.length
        ? `${error.message} Cleanup also failed: ${cleanupErrors.join("; ")}`
        : error.message;
      showError(new Error(feedback.textContent));
      return;
    }
    toast("Your media is published.", "success");
    try { await mediaList(); } catch (error) { showError(error); }
  });
}

function profileSettings() {
  section.innerHTML = `
    <div class="dashboard-title"><div><span class="eyebrow">Public profile</span><h1>Account settings</h1></div></div>
    <form id="profile-form" class="auth-card form-stack">
      <div class="field"><label for="creator-name">Creator name</label><input id="creator-name" name="name" value="${escapeHtml(artist.name)}" maxlength="100" required></div>
      <div class="field"><label for="creator-slug">Profile URL</label><input id="creator-slug" value="${escapeHtml(artist.slug)}" disabled></div>
      <div class="field"><label for="creator-bio">Biography</label><textarea id="creator-bio" name="bio" rows="4" maxlength="1000">${escapeHtml(artist.bio || "")}</textarea></div>
      
      <div class="field">
        <label>Profile picture</label>
        <div class="image-uploader-box">
          <div class="avatar-preview-wrap">
            <div class="artist-avatar" id="avatar-preview-circle">
              ${artist.avatar_url ? `<img src="${escapeHtml(artist.avatar_url)}" alt="Avatar preview">` : `<i class="icon-user"></i>`}
            </div>
            <div class="uploader-inputs">
              <input id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp">
              <input id="creator-avatar" name="avatar_url" type="url" value="${escapeHtml(artist.avatar_url || "")}" placeholder="Or paste image URL (https://)">
            </div>
          </div>
        </div>
      </div>

      <div class="field">
        <label>Cover photo</label>
        <div class="image-uploader-box">
          <div class="cover-preview-wrap">
            <div class="cover-preview-box" id="cover-preview-rect">
              ${artist.cover_url ? `<img src="${escapeHtml(artist.cover_url)}" alt="Cover preview">` : `<span>No cover photo uploaded</span>`}
            </div>
            <div class="uploader-inputs">
              <input id="cover-file" type="file" accept="image/jpeg,image/png,image/webp">
              <input id="creator-cover" name="cover_url" type="url" value="${escapeHtml(artist.cover_url || "")}" placeholder="Or paste image URL (https://)">
            </div>
          </div>
        </div>
      </div>

      <div class="field"><label for="subscription-price">30-day subscription price (XAF)</label><input id="subscription-price" name="subscription_price_xaf" type="number" min="100" step="50" value="${artist.subscription_price_xaf || ""}" placeholder="Leave blank to disable subscriptions"></div>
      <div class="field"><label for="instagram">Instagram URL</label><input id="instagram" type="url" value="${escapeHtml(artist.social_links?.instagram || "")}" placeholder="https://instagram.com/"></div>
      <div class="field"><label for="youtube">YouTube URL</label><input id="youtube" type="url" value="${escapeHtml(artist.social_links?.youtube || "")}" placeholder="https://youtube.com/"></div>
      <button class="btn" type="submit">Save profile</button>
    </form>`;

  const form = section.querySelector("#profile-form");
  const avatarFile = form.querySelector("#avatar-file");
  const avatarUrlInput = form.querySelector("#creator-avatar");
  const avatarPreview = form.querySelector("#avatar-preview-circle");

  const coverFile = form.querySelector("#cover-file");
  const coverUrlInput = form.querySelector("#creator-cover");
  const coverPreview = form.querySelector("#cover-preview-rect");

  avatarFile.addEventListener("change", async () => {
    const file = avatarFile.files[0];
    if (!file) return;
    try {
      const dataUrl = await uploadImageAsDataUrl(file, 400);
      avatarUrlInput.value = dataUrl;
      avatarPreview.innerHTML = `<img src="${dataUrl}" alt="Avatar preview">`;
    } catch (err) {
      toast(err.message, "error");
    }
  });

  avatarUrlInput.addEventListener("input", () => {
    const url = avatarUrlInput.value.trim();
    if (url) {
      avatarPreview.innerHTML = `<img src="${escapeHtml(url)}" alt="Avatar preview" onerror="this.remove()">`;
    } else {
      avatarPreview.innerHTML = `<i class="icon-user"></i>`;
    }
  });

  coverFile.addEventListener("change", async () => {
    const file = coverFile.files[0];
    if (!file) return;
    try {
      const dataUrl = await uploadImageAsDataUrl(file, 1600);
      coverUrlInput.value = dataUrl;
      coverPreview.innerHTML = `<img src="${dataUrl}" alt="Cover preview">`;
    } catch (err) {
      toast(err.message, "error");
    }
  });

  coverUrlInput.addEventListener("input", () => {
    const url = coverUrlInput.value.trim();
    if (url) {
      coverPreview.innerHTML = `<img src="${escapeHtml(url)}" alt="Cover preview" onerror="this.remove()">`;
    } else {
      coverPreview.innerHTML = `<span>No cover photo uploaded</span>`;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const save = form.querySelector('button[type="submit"]');
    save.disabled = true;
    try {
      const priceValue = form.elements.subscription_price_xaf.value;
      const price = priceValue ? Number(priceValue) : null;
      if (price !== null && (!Number.isInteger(price) || price < 100)) throw new Error("Subscription price must be at least 100 XAF.");
      const socialLinks = {};
      if (form.querySelector("#instagram").value.trim()) socialLinks.instagram = form.querySelector("#instagram").value.trim();
      if (form.querySelector("#youtube").value.trim()) socialLinks.youtube = form.querySelector("#youtube").value.trim();
      
      const updatedAvatar = avatarUrlInput.value.trim() || null;
      const updatedCover = coverUrlInput.value.trim() || null;

      await updateArtistProfile(artist.id, {
        name: form.elements.name.value.trim(),
        bio: form.elements.bio.value.trim(),
        avatar_url: updatedAvatar,
        cover_url: updatedCover,
        subscription_price_xaf: price,
        social_links: socialLinks,
      });
      artist = {
        ...artist,
        name: form.elements.name.value.trim(),
        bio: form.elements.bio.value.trim(),
        avatar_url: updatedAvatar,
        cover_url: updatedCover,
        subscription_price_xaf: price,
        social_links: socialLinks
      };
      toast("Profile saved successfully.", "success");
    } catch (error) {
      showError(error);
    } finally {
      save.disabled = false;
    }
  });
}

const handlers = { overview, media: mediaList, upload: uploadForm, profile: profileSettings };

async function init() {
  if (DEMO_MODE) {
    document.querySelector("#demo-banner").classList.remove("hidden");
    section.innerHTML = `<div class="state"><strong>Connect Supabase to open Creator Studio</strong><span>Creator accounts, media management, and analytics require a configured Supabase project.</span></div>`;
    document.querySelectorAll("[data-section]").forEach((button) => { button.disabled = true; });
    document.querySelector("#logout").disabled = true;
    return;
  }
  try {
    profile = await getCurrentProfile();
    if (!profile) {
      location.replace("auth.html");
      return;
    }
    if (profile.role !== "creator") {
      location.replace("index.html");
      return;
    }
    artist = await getOwnedArtist(profile.user.id);
    document.querySelector("#my-profile-link").href = `artist.html?artist=${encodeURIComponent(artist.slug)}`;
    document.querySelector("#logout").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await signOut();
        location.replace("index.html");
      } catch (error) {
        button.disabled = false;
        showError(error);
      }
    });
    document.querySelectorAll("[data-section]").forEach((button) => {
      button.addEventListener("click", async () => {
        document.querySelectorAll("[data-section]").forEach((item) => item.classList.toggle("active", item === button));
        try {
          await handlers[button.dataset.section]();
        } catch (error) {
          section.innerHTML = `<div class="state"><strong>Unable to load this section</strong><span>${escapeHtml(error.message)}</span></div>`;
          showError(error);
        }
      });
    });
    await supabaseReady;
    const initialSection = new URLSearchParams(location.search).get("section");
    if (handlers[initialSection]) {
      document.querySelectorAll("[data-section]").forEach((button) => {
        button.classList.toggle("active", button.dataset.section === initialSection);
      });
      await handlers[initialSection]();
    } else {
      await overview();
    }
  } catch (error) {
    section.innerHTML = `<div class="state"><strong>Creator Studio unavailable</strong><span>${escapeHtml(error.message)}</span><a class="btn" href="auth.html">Return to account</a></div>`;
  }
}

init();
