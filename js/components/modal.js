export function openModal(content) {
  const previousFocus = document.activeElement;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true" tabindex="-1">${content}</div>`;
  const close = () => {
    backdrop.remove();
    document.removeEventListener("keydown", onKeyDown);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") close();
  };
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  document.body.appendChild(backdrop);
  document.addEventListener("keydown", onKeyDown);
  backdrop.querySelector(".modal").focus();
  return { backdrop, close };
}
