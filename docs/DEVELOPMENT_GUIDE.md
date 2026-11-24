# Development Guide

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The project runs in demo mode until `window.ZIKLY_CONFIG` supplies Supabase values.

## Add a page

Create the HTML page at the project root for the current routing model, then add a matching module under `js/pages/` and optional page CSS under `css/`. Include global and shared component CSS before page CSS.

## Add features

Put backend calls in `js/services/`, reusable UI in `js/components/`, and page behavior in `js/pages/`. Keep demo data separate from live services. Preserve environment boundaries: only the Supabase publishable key belongs in browser configuration.

## Authentication and access

`auth.html` is the shared Fan/Creator authentication page. The database creates an immutable `profiles.role` row during Supabase Auth registration; Creator profiles are created by the database trigger. Do not write account roles or ownership decisions from browser code. Creator-owned content, fan purchases, and active creator subscriptions are protected with Row Level Security and verified again by Edge Functions.

## Media and payments

Creator uploads use the private `zikly-audio` bucket and the creator UUID as the first storage path segment. Keep audio/video/image content private and issue short-lived signed URLs only after access checks. Individual media unlocks are stored in `unlocks`; 30-day subscriptions are stored separately in `subscriptions`.

Apply migrations before deploying the Edge Functions. Deploy `initiate-payment`, `check-payment-status`, `fapshi-webhook`, `get-media-access`, and `get-fan-vault`. Fapshi credentials and the Supabase service-role key belong only in Supabase Function secrets. Payment access is granted only after the backend verifies Fapshi status; a frontend success state is never authoritative.
