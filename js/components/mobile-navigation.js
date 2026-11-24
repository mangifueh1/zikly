export function setupMobileNavigation() {
  const nav = document.querySelector(".main-nav");
  const menuButton = document.querySelector("#menu-button");
  if (!menuButton || !nav) return;

  const updateIcon = (isOpen) => {
    const icon = menuButton.querySelector("i");
    if (icon) {
      if (isOpen) {
        icon.className = "icon-x";
      } else {
        icon.className = "icon-menu";
      }
    }
  };

  const closeMenu = () => {
    nav.classList.remove("mobile-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    updateIcon(false);
  };

  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("mobile-open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    updateIcon(open);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuButton.focus();
    }
  });
}
