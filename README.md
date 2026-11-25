# Zikly 🎵

> A mobile-first, direct-to-fan monetization and streaming platform for African indie artists and creators.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-zikly.vercel.app-000000?style=for-the-badge&logo=vercel)](https://zikly.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20Supabase%20%7C%20Fapshi-3ECF8E?style=for-the-badge)](https://zikly.vercel.app)

---

## 🌐 Live Application & Submission Details

- **Hosted URL**: [https://zikly.vercel.app](https://zikly.vercel.app)
- **Repository**: [GitHub Repository](https://github.com/fuehm/zikly) *(replace with your submission link)*
- **Hackathon Submission**: Zikly — Empowering indie African creators with seamless digital sales, mobile money payments (Fapshi), and exclusive fan memberships.

---

## 💡 Overview

**Zikly** bridges the gap between independent musical creators and their supporters in Africa. Traditional streaming services often pay fractions of a cent per stream, rendering it nearly impossible for upcoming indie artists to earn a sustainable living. 

With Zikly:
- **Creators** can upload exclusive audio, video, and image releases, monetize tracks, set up 30-day recurring fan subscriptions, and view real-time sales and subscriber insights via their Creator Studio dashboard.
- **Fans** can discover fresh talent, stream free preview tracks, unlock individual exclusive releases or whole projects using local mobile money via Fapshi hosted checkout, and securely stream and download their unlocked media directly from their private **Fan Vault**.

---

## ✨ Key Features

- **Direct Fan Support & Mobile Payments**: Integrated with **Fapshi** hosted checkout for instant local mobile money (MTN MoMo, Orange Money) and payment settlement.
- **Creator Studio**: Manage public profile details, publish releases (audio/video/artwork), set pricing (XAF), and track revenue & subscribers.
- **Fan Vault**: Secure authenticated digital library displaying unlocked tracks, projects, and active subscription passes.
- **Role-Based Access Control**: PostgreSQL Row-Level Security (RLS) protects creator media and transaction records.
- **Signed Private Media Delivery**: High-value creator assets are stored securely in Supabase Storage and accessed only via short-lived, cryptographically signed URLs verified by Edge Functions.
- **Lightweight, Zero-Bundle Architecture**: Built with modern, pure vanilla HTML5, CSS3, and ES Modules for lightning-fast mobile loading speeds without framework bloat.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3, Lucide Icons
- **Backend & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Supabase Auth, Row Level Security)
- **File Storage**: Supabase Private Storage Buckets
- **Serverless API**: Supabase Edge Functions (Deno / TypeScript)
- **Payment Gateway**: [Fapshi API](https://fapshi.com) (Mobile Money checkout and verified webhook status)
- **Hosting**: [Vercel](https://vercel.com/)

---

## 🚀 How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/fuehm/zikly.git
cd zikly
```

### 2. Install dependencies

```bash
npm install
```

> *Note: This copies the Lucide icons asset library to `vendor/lucide` via postinstall.*

### 3. Start local development server

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

> 💡 **Demo Mode**: If no Supabase environment variables are provided, Zikly automatically runs in a local preview/demo mode using static showcase data so you can test the UI without needing immediate backend credentials.

---

## ⚙️ Backend & Supabase Setup (Optional for Full Deployment)

If you wish to run your own backend instance with live database, authentication, and payments:

### 1. Database & Migrations

Link your Supabase project and push the database migrations:

```bash
supabase login
supabase link --project-ref <YOUR_SUPABASE_PROJECT_REF>
supabase db push
```

### 2. Deploy Edge Functions

Deploy the serverless Edge Functions for payment processing and signed media access:

```bash
supabase functions deploy initiate-payment
supabase functions deploy check-payment-status
supabase functions deploy fapshi-webhook
supabase functions deploy get-media-access
supabase functions deploy get-fan-vault
```

### 3. Set Edge Function Secrets

Configure your Fapshi API credentials on Supabase:

```bash
supabase secrets set \
  FAPSHI_API_USER="your-fapshi-api-user" \
  FAPSHI_API_KEY="your-fapshi-api-key" \
  FAPSHI_WEBHOOK_SECRET="your-fapshi-webhook-secret" \
  FAPSHI_BASE_URL="https://sandbox.fapshi.com" \
  FAPSHI_INITIATE_PAY_PATH="/initiate-pay" \
  FAPSHI_STATUS_PATH="/payment-status"
```

### 4. Configure Webhooks

In your Fapshi Developer Dashboard, configure your Webhook URL to point to:
```
https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/fapshi-webhook
```

---

## 📁 Project Structure

```
zikly/
├── css/                  # Modular stylesheets (global, component, and page-specific)
├── js/
│   ├── components/       # Reusable UI web components (player, modals, toast)
│   ├── config/           # Supabase runtime configuration
│   ├── pages/            # Page-specific controllers (home, artist, studio, vault)
│   ├── services/         # Supabase client services (auth, tracks, storage, payments)
│   └── utils/            # Helper utilities (formatting, validation, phone formatting)
├── supabase/
│   ├── functions/        # Deno edge functions (payment handling & vault verification)
│   └── migrations/       # SQL schemas, RLS policies, and database triggers
├── scripts/              # Static build & vendor asset scripts
├── server.js             # Lightweight Node.js local dev server
├── index.html            # Main landing page
├── artist.html           # Public creator profile & discography
├── dashboard.html        # Creator Studio management dashboard
├── vault.html            # Fan vault & unlocked entitlements
└── auth.html             # Unified fan/creator authentication
```

---

## 👥 Hackathon Team & Acknowledgments

- **Live URL**: [https://zikly.vercel.app](https://zikly.vercel.app)
- Built for the Hackathon to showcase seamless creator monetization for African independent artists.
