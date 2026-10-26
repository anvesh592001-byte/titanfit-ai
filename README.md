# TitanFit AI — Precision Personalized Fitness Coach Platform

TitanFit AI is a production-oriented, full-stack personalized fitness coaching platform built with **Next.js 14 (App Router)**, **TypeScript (strict mode)**, **Tailwind CSS**, **Supabase Auth + PostgreSQL (with strict Row-Level Security)**, **Zod**, **Recharts**, **Vitest + PGlite**, **Playwright**, and a **server-side OpenAI-compatible LLM integration**.

Every calorie target, BMR/TDEE computation, macronutrient prescription, and food portion calculation is executed deterministically by verifiable server/domain modules (`src/lib/calculations/calorie-engine.ts` and `src/lib/nutrition/nutrition-engine.ts`) grounded in **USDA FoodData Central (`USDA_FDC`)** and **ICMR-NIN Indian Food Composition Tables 2017 (`IFCT_2017`)**—never hallucinated by an LLM.

---

## 1. Complete Feature & Page Inventory (All 18 Pages)

| # | Route | Access | Capability |
|---|---|---|---|
| 1 | `/` | Public | Landing page, interactive live Verified Food Composition Explorer, methodology, safety overview, and navigation |
| 2 | `/signup` | Public | Real Supabase Auth sign-up with password confirmation, Zod validation, and email-verification vs direct-session handling |
| 3 | `/login` | Public | Real Supabase Auth sign-in with clear credential/confirmation errors and `redirectTo` restoration |
| 4 | `/auth/verify-email` + `/auth/callback` | Public | Email confirmation instructions, resend verification button, and PKCE/OTP token exchange route |
| 5 | `/forgot-password` + `/reset-password` | Public | Supabase password recovery email dispatch and authenticated password update |
| 6 | `/onboarding` | Protected | 4-step personalized onboarding wizard (biometrics, goals, Indian/regional dietary preferences, allergies, training setup, clinical disclosures) |
| 7 | `/dashboard` | Protected | Daily Fitness Dashboard with macro progress rings, calorie trend chart, water/steps/sleep sync, workout quick-link, and habit toggles |
| 8 | `/calculator` | Public | Deterministic Mifflin–St Jeor BMR/TDEE/Calorie/Macro/Fiber calculator with Metric & Imperial support and Under-18 / VLCD safety guardrails |
| 9 | `/nutrition` | Protected | Personalized Daily & 7-Day Diet Planner with regional Indian/global meal patterns, strict allergy exclusion, equal-calorie substitutions, and Supabase persistence |
| 10 | `/food-tracker` | Protected | Searchable Verified & User Custom Food Tracker with breakfast/lunch/dinner/snack logging, gram/serving switcher, custom label creator, and deletion |
| 11 | `/workouts` | Protected | Personalized 7-Day Workout Generator (Home/Gym, Beginner/Intermediate/Advanced, injury-aware filtering, inline set edits, exercise swaps, and live set logger) |
| 12 | `/workout-history` | Protected | Chronological workout & exercise set log history, custom session logger, and confirmed deletion |
| 13 | `/ai-coach` | Protected | Server-side AI Fitness Coach grounded in deterministic BMR/TDEE/macros, verified food IDs, and clinical safety rules |
| 14 | `/progress` | Protected | Interactive Recharts analytics (`7d`, `30d`, `90d`, custom range) for body weight + 7-point moving average, calories/protein, steps/water, workout/habit consistency, and daily check-in CRUD |
| 15 | `/grocery-list` | Protected | Automatic ingredient deduplication & category grouping from active meal plans, manual items, persistent checkmarks, and print/markdown export |
| 16 | `/profile` | Protected | Full biometric, goal, dietary, allergy, and training profile editor with automatic target recalculation |
| 17 | `/settings` | Protected | Dark/Light theme switcher, Supabase password change, complete JSON data export (`GET /api/account/export`), and permanent account deletion (`DELETE /api/account/delete`) |
| 18 | `/privacy` | Public | Privacy policy, RLS data isolation architecture, emergency care guidance, and non-medical coaching disclaimer |

---

## 2. Tech Stack

- **Framework**: Next.js `14.2.35` (App Router, Server Components, Route Handlers, Middleware)
- **Language**: TypeScript `5.6` (`strict: true`, `noUncheckedIndexedAccess: true`)
- **Styling**: Tailwind CSS `3.4` (Obsidian black `#070709`, Charcoal surfaces, Deep Crimson `#dc2626` accent, Dark default + Light theme toggle)
- **Auth & Database**: Supabase Auth + Supabase PostgreSQL (`@supabase/supabase-js`, `@supabase/ssr`)
- **Validation & Security**: Zod schemas on client + server, sliding-window rate limiting, input sanitization, strict HTTP security headers
- **Charts**: Recharts `2.13`
- **Testing**:
  - **Unit / Integration / Real SQL & RLS Tests**: Vitest + `@electric-sql/pglite` (executes real PostgreSQL migrations and verifies RLS policies across roles and users)
  - **End-to-End Browser Tests**: Playwright (`chromium`)

---

## 3. Folder Structure

```text
├── e2e/                                  # Playwright E2E browser & API tests
├── src/
│   ├── app/
│   │   ├── (protected)/                  # Server-guarded authenticated pages & AppShell
│   │   │   ├── ai-coach/
│   │   │   ├── dashboard/
│   │   │   ├── food-tracker/
│   │   │   ├── grocery-list/
│   │   │   ├── nutrition/
│   │   │   ├── onboarding/
│   │   │   ├── profile/
│   │   │   ├── progress/
│   │   │   ├── settings/
│   │   │   ├── workout-history/
│   │   │   └── workouts/
│   │   ├── api/                          # Validated, rate-limited Server Route Handlers
│   │   ├── auth/                         # Email verification & PKCE callback handler
│   │   ├── calculator/                   # Public BMR/TDEE/Macro calculator
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── privacy/
│   │   ├── reset-password/
│   │   ├── signup/
│   │   └── page.tsx                      # Public Landing Page
│   ├── components/                       # Modular client & UI components
│   ├── lib/
│   │   ├── ai/coach-service.ts           # Server-only OpenAI-compatible AI Coach service
│   │   ├── calculations/                 # Metric/Imperial converters & Mifflin–St Jeor engine
│   │   ├── db/repositories.ts            # Typed Supabase data-access repositories
│   │   ├── nutrition/                    # Verified catalog, portion math, diet planner, grocery engine
│   │   ├── security/                     # Sanitization & rate limiting
│   │   ├── supabase/                     # Browser, Server, Middleware & Admin Supabase clients
│   │   ├── validation/schemas.ts         # Shared client/server Zod schemas
│   │   └── workouts/workout-generator.ts # Personalized workout & substitution engine
│   ├── middleware.ts                     # Auth session refresh & protected route guard
│   └── types/domain.ts                   # Strict domain & database interfaces
├── supabase/
│   └── migrations/
│       ├── 20261026000001_initial_schema.sql
│       ├── 20261026000002_rls_policies.sql
│       └── 20261026000003_seed_verified_foods.sql
└── tests/                                # Vitest unit, security, middleware & real PostgreSQL RLS suites
```

---

## 4. Local Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment variable template into .env.local
cp .env.example .env.local

# 3. Populate your real Supabase & LLM keys in .env.local (see Section 5-8 below)

# 4. Run development server
npm run dev
```

---

## 5. Supabase Project Setup & SQL Migrations

1. Create a new project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor** in your Supabase project (or use the Supabase CLI `supabase db push`) and execute the three idempotent migration files in order:
   1. `supabase/migrations/20261026000001_initial_schema.sql` — Creates all 13 tables (`profiles`, `user_preferences`, `foods`, `user_custom_foods`, `food_logs`, `meal_plans`, `workout_plans`, `workout_logs`, `exercise_logs`, `progress_logs`, `habits`, `habit_logs`, `grocery_lists`), constraints, indexes, `updated_at` triggers, and the `auth.users` signup bootstrap trigger.
   2. `supabase/migrations/20261026000002_rls_policies.sql` — Enables `ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` on every table, restricts `foods` to read-only `SELECT` for `authenticated` users, and enforces strict `auth.uid() = user_id` (`id` on `profiles`) across `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
   3. `supabase/migrations/20261026000003_seed_verified_foods.sql` — Seeds 40 traceable Indian & global whole foods (`USDA_FDC` and `IFCT_2017`).

---

## 6. Supabase Auth Redirect URL Configuration

In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (or your production domain, e.g., `https://titanfit.yourdomain.com`)
- **Redirect URLs** (add all applicable):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/reset-password`
  - `https://titanfit.yourdomain.com/auth/callback`
  - `https://titanfit.yourdomain.com/auth/callback?next=/reset-password`

> **Email Confirmation Behavior**: TitanFit AI natively handles both Supabase Auth modes:
> - **Confirm Email Enabled (Default)**: Sign-up redirects to `/auth/verify-email` with a Resend button; clicking the email link exchanges the PKCE code at `/auth/callback` and routes to `/onboarding`.
> - **Confirm Email Disabled**: Sign-up immediately establishes a session and routes directly to `/onboarding`.

---

## 7. Environment Variables (`.env.example`)

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public | Base URL used for auth callback redirects (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Your Supabase anon/public key (or set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Optional—used exclusively in `DELETE /api/account/delete` to purge the `auth.users` identity after deleting application rows |
| `LLM_API_KEY` | **Server-Only** | Server-side API key for `/api/ai/coach` (never exposed to browser) |
| `LLM_BASE_URL` | **Server-Only** | OpenAI-compatible base URL (default `https://api.openai.com/v1`) |
| `LLM_MODEL` | **Server-Only** | Chat model identifier (default `gpt-4o-mini`) |

---

## 8. Verified Food Composition Sources

All 40 seeded foods in `foods` carry explicit provenance (`source` and `source_food_id`):
- **`IFCT_2017`**: Indian Council of Medical Research – National Institute of Nutrition (*Indian Food Composition Tables 2017*) — covers regional staples including Idli, Plain Dosa, Cooked Chana Dal, Moong Dal, Rajma, Chole, Paneer, Curd/Dahi, Roti/Chapati, Ragi Roti, Poha, Upma, Sambar, Rasam, Roasted Chana, Sprouted Moong, Soya Chunks, Groundnuts, Mustard Oil, and Cow Ghee.
- **`USDA_FDC`**: U.S. Department of Agriculture *FoodData Central* — covers Chicken Breast, Whole Eggs, Egg Whites, Rohu/Salmon, Rolled Oats, Basmati Rice, Brown Rice, Sweet Potato, Whey Isolate, Tofu, Greek Yogurt, Milk, Banana, Apple, Spinach, Broccoli, Almonds, Peanut Butter, and Olive Oil.
- **Custom User Foods**: Authenticated users can log custom foods from verified nutrition labels into their own isolated `user_custom_foods` table (`is_verified = false`, `source = 'USER_LABEL'`), never polluting global verified records.

---

## 9. Running Automated Verification

```bash
# TypeScript strict verification
npm run typecheck

# ESLint check
npm run lint

# Vitest unit, security, middleware & real PostgreSQL PGlite RLS tests
npm test

# Production build
npm run build

# End-to-End Playwright Chromium tests
npm run test:e2e
```

---

## 10. Production Deployment

1. Push the repository to GitHub/GitLab and import into **Vercel** (or deploy as a Node.js 20 container running `npm run build && npm run start`).
2. Configure all environment variables from `.env.example` in your hosting platform's secret manager. Ensure `SUPABASE_SERVICE_ROLE_KEY` and `LLM_API_KEY` do **not** have `NEXT_PUBLIC_` prefixes.
3. Update Supabase Auth **Site URL** and **Redirect URLs** to match your production HTTPS domain.

---

## 11. Health Disclaimer & Safety Policy

TitanFit AI provides general fitness, exercise, and nutrition coaching for educational purposes only and is **not** a substitute for medical diagnosis, treatment, or clinical dietetics.
- Users **under 18** are automatically protected from adult weight-loss calorie deficits.
- Adult calorie targets enforce safe floors (**1,200 kcal/day female**, **1,500 kcal/day male**, **1,350 kcal/day general**) and reject Very-Low-Calorie Diets (VLCDs).
- Allergies are enforced as hard exclusions in meal generation and substitutions.
- Severe chest pain, dizziness, fainting, eating disorders, pregnancy/postpartum needs, or acute injuries are directed immediately to licensed healthcare professionals.
