# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
│   └── saas/               # CleanCalc Pro SaaS web app
│   └── mobile/             # Reinigungskalkulator mobile app (Expo)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Artifacts

### `artifacts/saas` (`@workspace/saas`) — CleanCalc Pro Web SaaS

Full-featured German-language SaaS web app for commercial cleaning companies. Mobile-first React + Vite + Tailwind, dark premium theme (muted teal `171 40% 42%`, background `222 20% 6%`), Inter font only. Dual-path data: Supabase when authenticated, localStorage via Zustand in demo mode.

**Routing:** Hash-based routing via `wouter` + `useHashLocation`. All URLs are `#/path`.

**Auth flow:** AuthGuard redirects: splash → onboarding → home based on `hasSeenSplash` / `hasOnboarded` store flags. Supabase auth (email/password) with session persistence, password reset, email confirmation with resend, and auth callback handling for hash routing. Demo mode uses localStorage fallback when Supabase is not configured.

**Supabase:** Connected via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets. Database schema in `supabase/migrations/001_initial_schema.sql`. Auto-provisioning trigger creates company, profile, settings, and subscription on user signup. RLS policies restrict all data access to user's company. Auth callback handler in `src/lib/auth-callback.ts` intercepts Supabase tokens from URL hash (email confirmation, password reset) before React router mounts.

**Screens:**
- `#/splash` — Animated splash screen (auto-redirects after 2.5s)
- `#/onboarding` — 3-step onboarding (role, company+rate, demo/fresh)
- `#/login`, `#/register` — Auth screens (Supabase auth with demo fallback)
- `#/passwort-vergessen` — Password reset request
- `#/passwort-reset` — Set new password (from email link)
- `#/` — Home dashboard (KPIs, quick actions, recent projects, upgrade CTA)
- `#/objekte` — Objects list with search, filter tabs (all/active/archived), action menu (duplicate/archive/delete)
- `#/objekte/:id` — Object detail (inline name edit, room list, add/edit rooms via RoomEditorSheet, info sheet, template save, PDF gate)
- `#/auswertung` — Global auswertung (all-project KPIs, top 5, recently edited)
- `#/auswertung/:id` — Per-project auswertung (breakdown by room group, Pro features preview with blur gate)
- `#/vorlagen` — Templates list (Pro-only, create from saved objects)
- `#/print/:id` — Print/PDF view (Pro-only, redirects Basic users to /upgrade)
- `#/einstellungen` — Settings (company, hourly rate, VAT, default frequency, PDF header/footer)
- `#/konto` — Account & plan status, legal links, logout, data reset
- `#/upgrade` — Pro plan upgrade page with mock checkout
- `#/impressum` — Legal: Impressum (placeholder)
- `#/datenschutz` — Legal: Datenschutzerklärung (placeholder)
- `#/agb` — Legal: AGB (placeholder)

**Feature gates (Basic plan limits):**
- Max 3 active projects (`canAddProject`)
- Max 20 rooms per project (`canAddRoom`)
- PDF export blocked (`canUsePDF`)
- Templates blocked (`canUseTemplates`)
- Custom performance override blocked (`canOverridePerformance`)

**Store:** Zustand with localStorage persistence, name `cleancalc-storage`, version 3 with migration. When authenticated via Supabase, data is synced from PostgreSQL; in demo mode, localStorage is used.

**BottomNav:** 5 tabs — Übersicht, Objekte, Auswertung, Einstellungen, Konto

**Stack:** React, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Zustand, Lucide React, Wouter (hash routing), shadcn/ui, Sonner (toasts), @supabase/supabase-js

**Supabase Integration:**
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars enable Supabase; without them, app runs in demo-only mode
- `src/lib/supabase.ts` — Supabase client singleton
- `src/lib/auth-context.tsx` — React context for auth state + signIn/signUp/signOut/resetPassword/updatePassword
- `src/hooks/use-supabase-sync.ts` — Syncs Supabase data into Zustand store on auth
- `src/hooks/use-store-actions.ts` — Hook wrapping all CRUD operations; routes through Supabase services when authenticated, falls back to Zustand store in demo mode
- `src/services/` — Service layer: object-service, template-service, settings-service, plan-service, profile-service, custom-room-type-service, migration-service
- `src/lib/migrations/001_initial_schema.sql` — Full PostgreSQL schema with RLS policies, auto-provisioning trigger, tables: companies, profiles, company_settings, subscriptions, cleaning_objects, rooms, templates, custom_room_types
- Demo data migration: on login/register, if demo data exists in localStorage, user is prompted to import it into their Supabase account

**Key files:**
- `src/App.tsx` — Router with AuthGuard, SupabaseAuthProvider, DataSync, all routes
- `src/store/use-store.ts` — Zustand store (projects, templates, settings, auth)
- `src/lib/auth-context.tsx` — Supabase auth context (login, register, logout, password reset, resend confirmation)
- `src/lib/auth-callback.ts` — Hash-routing auth callback interceptor (runs before React)
- `src/lib/supabase.ts` — Supabase client singleton
- `supabase/migrations/001_initial_schema.sql` — Full database schema with RLS + auto-provisioning trigger
- `src/lib/calc.ts` — Calculation engine (calcRoom, calcProjectTotals)
- `src/lib/feature-gates.ts` — Plan-based feature gates
- `src/data/room-types.ts` — 19 canonical room types in 7 groups
- `src/components/room-editor-sheet.tsx` — Room add/edit bottom sheet
- `src/components/upgrade-modal.tsx` — Upgrade prompt modal
- `src/components/confirm-dialog.tsx` — Destructive action confirmation
- `src/components/error-boundary.tsx` — React error boundary (German UI)
- `src/components/layout/BottomNav.tsx` — 5-tab bottom navigation
- `src/components/layout/PageTransition.tsx` — Framer Motion page wrapper

**Store (Zustand):**
- Name: `cleancalc-storage`, version 3 with migration
- Key state: `isLoggedIn`, `isDemo`, `plan` (basic/pro), `customRoomTypes`, `projects`, `templates`
- Methods: CRUD for projects/rooms/templates/customRoomTypes, `exportData`/`importData`/`resetToDefaults`/`resetAll`
- Feature gates: `canAddProject` (3 max basic), `canAddRoom` (20/project basic), `canUsePDF`, `canUseTemplates`, `canOverridePerformance`

**Shared types:** `src/types/index.ts` re-exports all shared types from store and data files

---

### `artifacts/mobile` (`@workspace/mobile`) — Reinigungskalkulator

German-language mobile app for commercial cleaning companies to calculate maintenance cleaning quotes. Built with Expo Router (React Native).

**Features:**
- Three tabs: Kalkulation, Auswertung, Einstellungen
- Add/edit/delete rooms with: name, room type, area, cleaning frequency, performance value
- Automatic calculation: monthly hours, monthly cost, annual cost per room and totals
- KPI cards: total area, monthly price, annual price, monthly hours, price/m²
- Editable project name, hourly rate, company name
- Room types with performance values editable in settings
- Demo data loader and reset all function
- Data persists with AsyncStorage (no backend needed)
- Dark mode UI with teal accent (#00C2A8)

**Key files:**
- `app/(tabs)/index.tsx` — main calculation screen
- `app/(tabs)/summary.tsx` — results/summary screen
- `app/(tabs)/settings.tsx` — settings screen
- `context/CalcContext.tsx` — shared state (rooms, settings, actions)
- `utils/calc.ts` — pure calculation logic + German number formatting
- `data/seed.ts` — default room types, groups, frequencies
- `types/index.ts` — TypeScript types
- `components/RoomFormModal.tsx` — add/edit room modal
- `components/KpiCard.tsx` — KPI display card
- `components/RoomCard.tsx` — room list item
- `constants/colors.ts` — dark mode theme

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
