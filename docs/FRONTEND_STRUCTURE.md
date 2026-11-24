# Frontend Structure

- `index.html` is the public homepage.
- `creators.html` and `projects.html` provide search-first discovery without eagerly loading browse results.
- `artist.html` is a public artist profile.
- `project.html` displays project and track details.
- `vault.html` contains the Fan Vault interface.
- `auth.html` contains artist login and registration.
- `dashboard.html` contains the artist studio.

`css/` contains global, shared-component, homepage, and page-specific styles. `js/pages/` initializes each page. `js/components/` contains reusable cards, modals, player, and notifications. `js/services/` encapsulates demo and Supabase data access. `js/utils/` contains formatting and validation helpers.

Keep browser imports relative to the current HTML file and preserve the existing module boundaries.
