# Zikly Project Overview

Zikly is a music discovery and creator-support platform for independent musicians and their fans. Artists publish music and creative projects, while fans discover releases, listen to free tracks, and unlock paid content.

## Users

- Fans discover artists and releases, use the Fan Vault, and purchase unlocked content.
- Artists publish projects and tracks, manage a profile, review transactions, and use the creator dashboard.

## Architecture

The frontend is a responsive vanilla JavaScript application served by `server.js`. Supabase provides authentication, PostgreSQL data, Storage, and Edge Functions. Fapshi integration is prepared for Cameroon Mobile Money payments. Demo data is isolated in `js/services/demo-data.js` and is used when Supabase configuration is absent.
