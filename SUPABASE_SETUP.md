# Zikly Supabase Setup

## Project

- Project URL: `https://epsuarukzljbnlheogqu.supabase.co`
- Project reference: `epsuarukzljbnlheogqu`
- The frontend uses the supplied publishable key only.
- Never commit the Supabase service-role key or Fapshi credentials.

## Database

Install the Supabase CLI, then authenticate and link the project:

```bash
npx.cmd supabase login
npx.cmd supabase link --project-ref epsuarukzljbnlheogqu
npx.cmd supabase db push
```

Review the remote migration history before pushing. The migrations use additive, non-destructive changes. Do not run destructive reset commands.

## Storage

The existing private bucket is `zikly-audio`. It accepts audio, video, JPEG, PNG, and WebP uploads up to 100 MB. Exclusive files remain private; the app signs short-lived URLs only after entitlement checks.

Media paths follow `creator-id/project-id/filename.ext`.

## Authentication

Enable Email/Password authentication and set the production Site URL and redirect URLs. For local development, use `http://localhost:3000/auth.html`. Role assignment is validated by the `handle_new_user` database trigger and is not writable by normal frontend queries.

## Edge Functions

Deploy all required functions:

```bash
npx.cmd supabase functions deploy initiate-payment
npx.cmd supabase functions deploy check-payment-status
npx.cmd supabase functions deploy fapshi-webhook
npx.cmd supabase functions deploy get-media-access
npx.cmd supabase functions deploy get-fan-vault
```

Configure secrets in Supabase:

```bash
npx.cmd supabase secrets set \
  FAPSHI_API_USER="..." \
  FAPSHI_API_KEY="..." \
  FAPSHI_WEBHOOK_SECRET="..." \
  FAPSHI_BASE_URL="https://sandbox.fapshi.com" \
  FAPSHI_INITIATE_PAY_PATH="/initiate-pay" \
  FAPSHI_STATUS_PATH="/payment-status"
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions.

## Fapshi sandbox

- Base URL: `https://sandbox.fapshi.com`
- Hosted checkout: `POST /initiate-pay`
- Status: `GET /payment-status/{transId}`
- Authentication headers: `apiuser` and `apikey`
- The webhook must send `x-wh-secret`; configure the exact secret in both the Fapshi dashboard and Supabase.
- Webhook URL: `https://epsuarukzljbnlheogqu.supabase.co/functions/v1/fapshi-webhook`

Do not perform a real payment until sandbox tests are complete. A `200` from `initiate-pay` means that a checkout link was created, not that payment succeeded. Entitlements require verified `SUCCESSFUL` status.

## Testing

Test creator and fan signup/login, RLS, public metadata, private uploads, signed media access, purchase/status settlement, subscriptions, expiration, and duplicate settlement. Use sandbox credentials and small test amounts.

## Production checklist

- Configure Email/Password Auth and SMTP.
- Set exact production redirect and webhook URLs.
- Set the live Fapshi credentials and live base URL in Supabase secrets.
- Add Fapshi IP whitelist and dashboard webhook configuration.
- Verify the migration and RLS state against the remote database.
- Confirm storage MIME limits and private bucket behavior.
- Confirm payment reconciliation and settlement with sandbox transactions.
- Remove or retain demo data explicitly; demo mode must remain visibly separate from production.
