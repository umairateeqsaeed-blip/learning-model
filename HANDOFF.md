# 🌟 Star Learner — Project Handoff / Context

**Last updated:** 2026-06-30
**Purpose of this file:** Give a brand-new session (or a new developer) everything
needed to continue this project without re-discovering anything.

---

## 1. What this project is

**Star Learner** — a personalized learning web app for a child **aged 6–8
(Grades 1–3)**, covering **Math**, **Science**, and **Brain Games** (logic,
shapes, geography, fun facts).

- Pure **static web app** (HTML/CSS/vanilla JS) — **no build step**.
- **Parent login** (email + password) via **Supabase Auth**.
- Multiple **child profiles** per parent; per-child progress saved to Supabase
  and cached in `localStorage`. **Offline fallback** if cloud is unreachable.
- Adaptive difficulty (6 levels/subject), daily plan, stars, badges, streaks,
  Parent Corner.

---

## 2. CURRENT STATUS

### ✅ Done
- Full app built and tested in a real browser (login UI, offline mode, full
  lesson flow) — no errors.
- **Supabase project created** and schema applied with Row-Level Security.
- Supabase JS client **vendored locally** (`vendor/supabase.js`) — no runtime CDN.
- `config.js` already points at the correct Supabase project (`star-learner`).
- Code committed/pushed to the original GitHub repo (see §4).

### ⏳ Remaining (the only things left)
1. **Get the app code into `cansport-lgtm/star-learner`** (the new repo on the
   account that also owns Vercel + the Supabase `cansport` org).
   - If this session is scoped to `cansport-lgtm/star-learner`, just commit all
     the app files (listed in §6) to branch `main` and push.
2. **Deploy on Vercel**: import `cansport-lgtm/star-learner` →
   Framework **Other**, Build Command **empty**, Output Directory **empty** → Deploy.
3. **One-time Supabase auth settings** using the live Vercel URL (see §5).

---

## 3. Account situation (IMPORTANT — this caused earlier friction)

There are **two GitHub accounts** in play:
- **`umairateeqsaeed-blip`** — owns the *original* repo `learning-model`. The
  earlier sessions were authenticated as this account.
- **`cansport-lgtm`** — the user's main account; owns the **Vercel** account and
  is tied to the **Supabase** org (`cansport@gmail.com`). The **new repo
  `star-learner` lives here.**

➡️ **Goal:** consolidate everything under `cansport-lgtm`. Start the new session
with **`cansport-lgtm/star-learner`** as the source so it can push there directly.

---

## 4. GitHub repos

| Role | Repo | Branch | Notes |
|------|------|--------|-------|
| **Target (use this)** | `cansport-lgtm/star-learner` | `main` | New repo; needs the app files committed |
| Original (source of code) | `umairateeqsaeed-blip/learning-model` | `claude/child-learning-app-3yty5o` | Has the finished code; default branch |

The complete code is also delivered to the user as **`star-learner.zip`**.

---

## 5. Supabase — `star-learner` (already configured)

These values are **public by design** (publishable key is meant for client code;
security is enforced by Row-Level Security). They are already in `config.js`.

- **Project name:** `star-learner`
- **Project ref / id:** `iqqludtsootlcbrucfiu`
- **API URL:** `https://iqqludtsootlcbrucfiu.supabase.co`
- **Publishable (anon) key:** `sb_publishable_3JyRJN_biqj54tnYMUxS0w_NiRIqoTG`
- **Region:** ap-south-1 · **Org:** `xvocfadpmvnnmbstnbsf` (cansport@gmail.com)
- **Cost:** this is a paid project (~$10/month — it's the org's 3rd project).

### Database schema (already applied)
Table **`public.child_profiles`**:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`
- `name text not null` (1–40 chars)
- `avatar text not null default '🦊'`
- `state jsonb not null default '{}'` — full progress blob
- `created_at`, `updated_at timestamptz` (updated_at auto-maintained by trigger)
- **RLS ON** with 4 policies (select/insert/update/delete) all keyed to
  `auth.uid() = user_id`, role `authenticated`.
- Security advisors: **clean** (trigger function has `search_path = ''`).

### ⚠️ One-time auth settings still needed (in Supabase dashboard)
After the site has a URL:
- **Authentication → URL Configuration**: set **Site URL** and add **Redirect URL**
  = the Vercel URL (e.g. `https://star-learner.vercel.app` and `.../**`).
- **Authentication → Providers → Email**: for smoothest UX, turn **OFF
  "Confirm email"** so parents log in immediately on sign-up. (App already
  handles the "check your email" case if left on.)

---

## 6. File inventory (what must be in the repo to run)

| File | Purpose |
|------|---------|
| `index.html` | Page shell; loads vendor/supabase.js, config.js, content.js, app.js |
| `styles.css` | Kid-friendly styling |
| `config.js` | Public Supabase URL + publishable key (already set to star-learner) |
| `content.js` | Questions, facts, 6 levels/subject, badge definitions |
| `app.js` | App logic: auth, profiles, daily plan, quizzes, cloud sync, parent corner |
| `vendor/supabase.js` | Supabase JS v2 UMD, vendored (110 KB) |
| `vendor/591.supabase.js` | tiny webpack chunk (ws fallback; never loads in browser) |
| `vercel.json` | Static hosting config |
| `README.md` | User-facing docs |
| `.gitignore`, `.vercelignore` | housekeeping |
| `assets/*.png` | screenshots (not needed at runtime) |

---

## 7. Exact steps for the NEW session

> Assumes the new session is scoped to `cansport-lgtm/star-learner`.

1. **Add the code.** If the repo is empty, recreate the files from `star-learner.zip`
   (user has it) or from `umairateeqsaeed-blip/learning-model`, then commit all
   files in §6 to `main` and push. Verify `config.js` matches §5.
2. **Verify locally** (optional): `python3 -m http.server` and click through, or
   run a quick Playwright check (lib loads, login screen shows, offline lesson works).
   Note: this sandbox's proxy blocks `supabase.co` and `vercel.com`, so live
   network calls fail *here* but work in a normal browser.
3. **Deploy:** guide the user to import the repo on Vercel (Framework Other, no
   build), or it auto-deploys if Vercel Git integration is connected.
4. **Finish Supabase auth settings** (§5) with the live URL.
5. **Verify the live site** end-to-end (sign up, create child, do a lesson,
   confirm a row appears in `child_profiles`).

---

## 8. Gotchas / lessons learned

- **Don't use a runtime CDN** for Supabase — this environment blocks jsdelivr/unpkg.
  npm registry IS allowed, so the lib was fetched via `npm pack @supabase/supabase-js`
  and copied from `dist/umd/`. It's already vendored; keep it that way.
- The sandbox **cannot reach Vercel or Supabase over HTTPS** (proxy 403), so
  deployment and live auth must be done/verified by the user in a normal browser.
- The `el()` helper in `app.js` returns only the first root node — pass
  **single-root** HTML to it (multi-root content is set via `innerHTML` on an
  already-mounted element). A bug here was already fixed.
- Keep RLS ON. The publishable key is safe to commit; never commit the
  **service_role** key.
