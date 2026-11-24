# Zikly Project Handover

## What is implemented

### Frontend
- Vanilla HTML, CSS, and JavaScript pages for discovery, public creator profiles, releases, the Fan Vault, shared authentication, account settings, and Creator Studio.
- One Supabase Auth flow supports Creator and Fan registration, login, and password reset.
- Creators can publish audio, video, and images to private Supabase Storage, manage their releases, configure profile/subscription details, and review database-backed earnings, unlocks, subscribers, and recent payment updates.
- Fans can browse public creator profiles, play eligible free audio, purchase individual exclusive media, subscribe for 30 days with a one-time payment, and access entitlements in their authenticated vault.
- Demo mode is clearly marked and does not fabricate payment results or live analytics.

### Database and access control
- Apply both migrations in `supabase/migrations/`.
- `profiles.role` is created from the signup request by a database trigger and is not writable by users. Allowed roles are `creator` and `fan`; profile data is backfilled for existing users.
- Creator-owned artist, project, track, transaction, and storage operations are protected by Row Level Security and ownership checks.
- Fan purchases (`unlocks`) and creator-specific 30-day subscriptions are stored separately and associated with the authenticated fan account.
- Private storage files use paths in the form `creator-id/project-id/file-name.ext`.
- `settle_payment` is a server-only RPC that records verified provider status and creates purchase/subscription entitlements atomically.

### Supabase Edge Functions and payments
- `initiate-payment`: authenticates the fan, validates the target and database price, creates a pending payment, and creates a hosted Fapshi checkout link with `POST /initiate-pay`.
- `check-payment-status`: checks the caller's own payment against Fapshi before settling it.
- `fapshi-webhook`: verifies the configured webhook signature and independently checks Fapshi status.
- `get-media-access`: verifies creator ownership, an individual/project purchase, a current subscription, or eligible free public access before signing a short-lived URL.
- `get-fan-vault`: returns the authenticated fan's purchased media, active subscription content, and subscription expiration history.
- Fapshi secrets and the Supabase service-role key must remain server-side.

## Setup and deployment

1. Configure a Supabase project and set the frontend-safe Project URL and publishable/anon key through `window.ZIKLY_CONFIG`. Never put a service-role key or Fapshi secret in frontend configuration.
2. Apply the migrations:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. Enable Supabase Email/Password authentication, set production Site URL and redirect URLs, and configure SMTP for email verification and password resets.
4. Deploy the Edge Functions:

   ```bash
   supabase functions deploy initiate-payment
   supabase functions deploy check-payment-status
   supabase functions deploy fapshi-webhook
   supabase functions deploy get-media-access
   supabase functions deploy get-fan-vault
   ```

5. Configure function secrets with the Supabase CLI:

   ```bash
   supabase secrets set \
     FAPSHI_API_USER="..." \
     FAPSHI_API_KEY="..." \
     FAPSHI_WEBHOOK_SECRET="..." \
     FAPSHI_BASE_URL="..." \
     FAPSHI_INITIATE_PAY_PATH="/initiate-pay" \
     FAPSHI_STATUS_PATH="..."
   ```

   Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into the browser.

6. Confirm the Fapshi hosted checkout request/response fields, status endpoint, minimum amount, and webhook secret scheme. Configure the webhook URL as `https://YOUR_PROJECT.supabase.co/functions/v1/fapshi-webhook`.
7. Test with Fapshi sandbox credentials, confirm only verified payments create entitlements, and deploy the static frontend to a production host.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without frontend Supabase configuration the app runs in visibly marked demo mode; authentication, storage, vault, live statistics, and payment actions require a configured Supabase project and deployed functions.

## External configuration still required

- Supabase project credentials, Auth email settings, migrations, and Edge Function deployment.
- Fapshi sandbox/production credentials and confirmation of current provider endpoint and webhook specifications.
- Production verification of file size/type limits, RLS policies, payment settlement, signed URL access, and 30-day subscription expiration.
- Creator profile avatar and cover are currently set with image URLs in Account Settings; creator media uploads support private audio, video, and image files.
- For exact migration and deployment commands, see `SUPABASE_SETUP.md`.
