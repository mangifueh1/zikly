# Zikly

Zikly is a mobile-first, vanilla JavaScript music and creator-support platform. It uses one shared Supabase Auth page for Fans and Creators, PostgreSQL with Row Level Security, private Supabase Storage, and Supabase Edge Functions for verified Fapshi hosted-checkout purchases.

Creators can publish audio, video, and image releases, configure 30-day subscriptions, and see confirmed sales activity. Fans can discover creators, unlock eligible media, subscribe, and access entitlements in their private Fan Vault. Payment-dependent features require deployed Edge Functions and configured Fapshi credentials; demo mode never fabricates payments or live statistics.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Without Supabase configuration, Zikly runs in a clearly marked demo mode using preview data. No fake payment success is performed.

See `PROJECT_HANDOVER.md` for complete setup, deployment, and integration instructions.

Additional frontend documentation is available in `docs/`.
