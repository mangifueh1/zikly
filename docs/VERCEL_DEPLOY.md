# Deploy Zikly on Vercel

The frontend is a **static multi-page site**. Vercel does not run `server.js`. `npm run build` copies HTML, CSS, JS, and Lucide fonts into `dist/`.

## What is already wired

- `vercel.json` uses framework `null`, `npm install`, `node scripts/build-static.js`, output `dist/`
- `npm install` copies Lucide fonts into `css/vendor/lucide` (`postinstall`)
- `css/global.css` imports `vendor/lucide/lucide.css`
- Every page loads `js/config/runtime.js` (`window.ZIKLY_CONFIG`, `demoMode: false`)
- Publishable Supabase values only. Service-role and Fapshi secrets stay in Supabase.

## Live deployment

- Production: https://zikly.vercel.app
- Dashboard: https://vercel.com/fuehmangi410-8226/zikly
- GitHub repo is connected (`mangifueh1/zikly`). Commit and push local deploy changes so the next Git deploy does not revert them.

## Deploy again

```bash
npm install
npx vercel --prod --yes
```

Do **not** set the start command to `npm start`.

## After the first URL exists

In Supabase → Authentication → URL configuration:

- **Site URL:** `https://YOUR-APP.vercel.app`
- **Redirect URLs:** `https://YOUR-APP.vercel.app/auth.html` and `http://localhost:3000/auth.html`

Password reset uses `/auth.html`. Fapshi return uses `/vault.html`. The Fapshi webhook stays on Supabase (`/functions/v1/fapshi-webhook`), not Vercel.

## Local

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Icons need the `postinstall` copy of Lucide (runs with `npm install`).
