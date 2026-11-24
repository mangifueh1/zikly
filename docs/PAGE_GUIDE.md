# Page Guide

- `index.html`: discovery hero, artist search, featured projects, featured artists, recent releases, artist CTA, and footer.
- `creators.html`: creator search; creator results load only after a search is entered.
- `projects.html`: project search; project results load only after a search is entered.
- `artist.html`: public creator profile, social links, subscription offer, category tabs, and published projects.
- `project.html`: artwork, project metadata, media purchase actions, free playback, and media previews.
- `vault.html`: authenticated Fan Vault with individual purchases, subscription access, and expiration dates.
- `auth.html`: shared Fan/Creator sign-in, registration, and password reset.
- `dashboard.html`: role-protected Creator Studio with real payment statistics, media management, secure uploads, and profile settings.
- `account.html`: authenticated account details, password changes, and logout.

The shared navigation reflects the signed-in account role. Creator dashboard and media-management access is also enforced by Supabase policies and ownership checks, not only by frontend routing.
