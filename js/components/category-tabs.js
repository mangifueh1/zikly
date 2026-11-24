export function categoryTabs(active = "all") {
  const categories = [
    ["all", "All"], ["ep", "EPs"], ["single", "Singles"],
    ["visual", "Visuals"], ["vault_extra", "Vault Extras"],
  ];
  return `<div class="tabs" aria-label="Project categories">${categories.map(([value, label]) =>
    `<button class="tab ${value === active ? "active" : ""}" data-category="${value}">${label}</button>`
  ).join("")}</div>`;
}
