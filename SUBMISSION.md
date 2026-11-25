# Hackathon Submission: Zikly

---

## 1. Project Name, Track & Team Members

- **Project Name:** Zikly
- **Track:** Creator Commerce
- **Team Members:**
  - **Mangi Lerine**
  - **Mangi Marvelous**
  - **Mbella Ivo**

---

## 2. Problem Statement (150 Words Maximum)

African indie creators face a severe monetization paradox: while cultural engagement is at an all-time high, global streaming algorithms pay fractions of a cent per stream, requiring millions of plays to earn a livable income. Simultaneously, existing global direct-to-fan platforms (Patreon, Bandcamp, OnlyFans) rely almost exclusively on international credit cards and Western banking rails—excluding over 80% of African consumers who rely on local Mobile Money (MTN MoMo, Orange Money). 

Fans genuinely want to support their favorite artists and access exclusive tracks, unreleased clips, and behind-the-scenes content, but lack frictionless local channels to do so. Independent creators are left stranded with no viable avenue to convert domestic attention into sustainable livelihoods. 

By eliminating the card barrier and enabling instant, direct micro-transactions and recurring memberships via Mobile Money, Zikly unlocks untapped domestic creator commerce across Africa.

*(Word count: 141 words)*

---

## 3. Working Demo

- **Live Application Link:** [https://zikly.vercel.app](https://zikly.vercel.app)
- **Demo Access / Instructions:** The web application is mobile-first, responsive, and immediately testable on any browser. Users can explore creator profiles, preview music, test seamless Fapshi mobile money checkout flows, and access authenticated Creator Studio & Fan Vault dashboards.

---

## 4. Code Repository & Run Instructions

- **Repository Link:** [https://github.com/mangifueh1/zikly](https://github.com/mangifueh1/zikly)

---

## 5. What Was Built During the Hackathon vs. What Existed Before

Everything in this submission was built **100% from scratch during the hackathon**. Prior to the event, zero code, databases, or UI assets existed—only the observed frustration of local creators unable to monetize their audiences. During the hackathon period, our team architected and delivered the full end-to-end platform: a lightweight, zero-bundle mobile-first frontend in vanilla JavaScript and modern CSS; a comprehensive Creator Studio for publishing audio/video releases, pricing in local currency (XAF), and tracking earnings; a secure Fan Vault with authenticated playback; Supabase database schemas and Row-Level Security (RLS) policies for protected media access; and full integration with the Fapshi payment gateway for real-time Mobile Money settlements and webhook verification. While global platforms like Patreon or Bandcamp exist abroad, they fundamentally ignore African payment infrastructure; Zikly is built natively for this underserved market.
