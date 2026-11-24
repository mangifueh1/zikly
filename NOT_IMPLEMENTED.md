# Zikly: CIMFEST Hackathon MVP Gaps

This file contains only the work required to make the complete Zikly demo usable during a CIMFEST Hackathon presentation. Zikly should use the **Fapshi sandbox only**. No real-money payments or payout flow are needed.

## 1. Production configuration

- Deploy the Supabase migrations and the five required Edge Functions.
- Enable Supabase Email/Password authentication.
- Configure the hackathon redirect URLs, including the hosted demo URL and `http://localhost:3000/auth.html`.
- Configure the Fapshi sandbox credentials and sandbox base URL in Supabase secrets.
- Configure the sandbox webhook URL and webhook secret.
- Test the full sandbox payment flow with small/test transactions only.
- Leave demo mode clearly separate from the live demonstration.

## 2. End-to-end payment and subscription flow

- Confirm that Fapshi sandbox checkout opens correctly from both:
  - individual media purchase;
  - creator subscription purchase.
- Confirm that only a verified sandbox `SUCCESS` creates a purchase unlock or 30-day subscription.
- Confirm that failed, expired, and pending payments do not grant access.
- Confirm duplicate payment settlement does not create duplicate entitlements.
- Demonstrate that an active subscription grants access to the creator's exclusive content.
- Show that media and subscriptions expire or disappear correctly from the Fan Vault after 30 days.
- Show that a fan can manually subscribe again after the first 30-day period expires.

For the Hackathon, subscriptions must be presented as **30-day sandbox subscription payments**, not as automatic recurring subscriptions. Automatic monthly renewal, recurring billing, cancellation, renewal reminders, and renewal payment retries are outside scope.

## 3. Fan Vault

- Verify that purchased media appears under the signed-in fan account.
- Verify that active 30-day creator subscriptions appear in the vault.
- Verify that expired subscription content is no longer accessible.
- Add a clear vault empty state and a clear expired-subscription state for demo use.
- Verify that vault access is denied to signed-out users and to another fan's account.

## 4. Secure media access

- Verify private audio, video, and image uploads in the `zikly-audio` bucket.
- Verify signed URLs expire and cannot be reused for unauthorized playback or downloads.
- Verify free preview playback, free media access, individual purchases, and active subscriptions all follow the intended access rules.
- Verify creator owners can manage only their own projects and media.
- Verify basic upload validation: supported media type and maximum 100 MB file size.

## 5. Creator demo tools

- Complete the upload flow:
  - create/publish a project;
  - upload an audio, video, or image file;
  - mark it free or exclusive;
  - set an exclusive price.
- Complete the profile settings flow:
  - name and biography;
  - avatar and cover image URLs;
  - 30-day subscription price;
  - Instagram and YouTube links.
- Confirm that the creator dashboard shows:
  - confirmed sandbox earnings;
  - media sold;
  - active subscribers;
  - recent payment updates.
- Deletion should remove the track and its private storage file and clean up an empty project.

## 6. Essential account flows

- Test fan signup, creator signup, login, logout, and password reset.
- Confirm that a user cannot change or bypass their assigned fan/creator role.
- Confirm that creator pages and dashboard routes are inaccessible to fans.
- Confirm that fans cannot create or edit creator media.
- Confirm that account settings and the Fan Vault work for the signed-in account.

## 7. Discovery and public pages

- Verify creator search and project search.
- Verify public creator profiles, project cards, free media, exclusive media, and subscription cards.
- Verify creator category tabs and project detail pages.
- Verify that the profile share button works on mobile and desktop.

## 8. Final Hackathon verification

Before the presentation, run one complete demo using two accounts:

1. Sign in as a creator.
2. Publish free and exclusive demo media.
3. Set a low sandbox subscription price.
4. Sign in as a fan.
5. Purchase a piece of exclusive media using the Fapshi sandbox.
6. Purchase a 30-day creator subscription using the Fapshi sandbox.
7. Open the Fan Vault and play or view both entitlements.
8. Check the creator dashboard for sandbox earnings and activity.
9. Sign out and confirm that unauthorized users cannot access private entitlements.

## Out of scope for CIMFEST

- Real payments and real creator payouts.
- Automatic monthly renewals and recurring billing.
- Refunds, disputes, chargebacks, taxes, invoices, and revenue sharing.
- KYC or creator verification.
- Native mobile apps, PWA/offline mode, and push/SMS notifications.
- Social login, two-factor authentication, messaging, comments, likes, follows, and recommendations.
- Admin dashboard, moderation, support ticketing, and advanced analytics.
- Editing published media/project details and scheduling future releases.
- Terms, Privacy, and cookie-policy pages.
