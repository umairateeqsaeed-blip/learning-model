# 🌟 Star Learner — Personalized Learning Plan

A fun, kid-friendly web app that gives your child (ages **6–8 / Grades 1–3**) a
**personalized daily learning plan** across **Math**, **Science**, and
**Brain Games** (logic, shapes, geography, fun facts).

It runs in the browser and now supports an optional **parent login** so your
child's progress is **saved to the cloud (Supabase)** and synced across
devices. If the cloud isn't configured/reachable, it automatically falls back
to an **offline mode** that saves progress on the device.

---

## ▶️ Quick start (local)

1. Make sure `config.js` has your Supabase URL + publishable key (already set
   if this repo was configured for you).
2. Serve the folder (a tiny static server is enough):
   ```bash
   python3 -m http.server 8000
   # open http://localhost:8000
   ```
   > Opening `index.html` by double-click also works, but a local server is
   > recommended so the login (network) features behave normally.

---

## ☁️ Cloud + login (Supabase)

The app uses [Supabase](https://supabase.com) for the parent login and to store
each child's progress.

**Data model** — one table, `child_profiles`:

| column | type | notes |
|--------|------|-------|
| `id` | uuid | primary key |
| `user_id` | uuid | the parent (auth user); defaults to `auth.uid()` |
| `name` | text | child's name |
| `avatar` | text | emoji buddy |
| `state` | jsonb | full progress blob (stars, levels, plan, badges…) |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto-maintained |

**Security** — Row-Level Security is **on**, with policies so a parent can only
read/write their **own** children's rows. The publishable/anon key in
`config.js` is *public by design*; safety comes from RLS, not from hiding it.

### One-time auth settings (in the Supabase dashboard)
Authentication → **URL Configuration**:
- Set **Site URL** to your deployed URL (e.g. `https://your-app.vercel.app`).
- Add the same URL under **Redirect URLs**.

Authentication → **Providers → Email** → for the smoothest experience you can
turn **off** "Confirm email" (parents are logged in immediately on sign-up).
Leave it **on** if you prefer verified emails — the app already shows a
"check your email to confirm" message in that case.

---

## 🚀 Deploy to Vercel

This is a static site (no build step).

- **Easiest:** import the GitHub repo at [vercel.com/new](https://vercel.com/new)
  and deploy — framework preset "Other", no build command, output = repo root.
- Or use the Vercel CLI: `npx vercel --prod` from this folder.

After deploying, do the **one-time auth settings** above using your new Vercel
URL so login works on the live site.

> The Supabase keys live in `config.js` and are public by design, so no Vercel
> environment variables are required. (You *can* move them to env vars + a build
> step later if you prefer.)

---

## ✨ Features

- **Parent login** (email + password) with private, per-family data.
- **Multiple children** per parent account, each with their own progress.
- **Today's Plan** — a fresh 3-step plan each day, one activity per subject.
- **Adaptive difficulty** — 6 levels per subject that auto-adjust to performance.
- **Stars & rewards** — stars, perfect-score bonuses, confetti, sounds, and a
  **🔥 daily streak**.
- **12 badges** to collect.
- **Parent Corner** — progress stats, per-subject levels, badges, switch child,
  sign out, reset progress.
- **Offline fallback** — works without a connection; syncs when signed in.

---

## 📚 Lesson content

- **Math** 🔢 — counting, add/subtract, intro multiply/divide, word problems
  (generated, so endless practice).
- **Science** 🔬 — bite-size facts + a question (animals, body, space, weather…).
- **Brain Games** 🧩 — shapes, patterns, opposites, logic, geography, time.

All content lives in **`content.js`** and is easy to edit/extend.

---

## 🛠️ Project structure

| File | What it does |
|------|--------------|
| `index.html` | Page shell; loads the vendored Supabase lib, config, content, app |
| `styles.css` | Kid-friendly look (big buttons, colors, animations) |
| `config.js` | Public Supabase URL + publishable key |
| `content.js` | Questions, facts, levels, badges |
| `app.js` | App logic: auth, profiles, daily plan, quizzes, sync, parent corner |
| `vendor/supabase.js` | Supabase JS client, vendored locally (no runtime CDN) |
| `vercel.json` | Static hosting config |

---

## 🔒 Privacy

Progress is stored in your own Supabase project (your data) and cached locally
on the device. With RLS, one family can never see another's data. Use **Parent
Corner → Reset progress** to clear a child's progress anytime.

---

Enjoy, and happy learning! 🌟
