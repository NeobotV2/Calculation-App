# Overview

This is a pnpm workspace monorepo utilizing TypeScript for building a suite of applications focused on commercial cleaning businesses. The project aims to provide a comprehensive digital solution, including a full-featured SaaS web application (CleanCalc Pro), a mobile application (Reinigungskalkulator), and a robust API backend. The core purpose is to streamline cleaning quote calculations, project management, and business operations for commercial cleaning companies, with a strong emphasis on the German market.

The project envisions empowering cleaning businesses with efficient tools, offering a scalable platform with both basic and "Pro" plan features. It targets market potential by providing specialized, localized solutions for an underserved niche.

# User Preferences

I prefer iterative development, with a focus on delivering small, functional increments.
I prefer clear and concise communication.
Please provide detailed explanations for complex architectural decisions or significant code changes.
I value maintainable and readable code, favoring functional programming paradigms where appropriate.
Ask for confirmation before making any major architectural changes or introducing new external dependencies.
Do not make changes to the `lib/api-spec` directory unless specifically instructed.
Do not modify the core `src/lib/calc.ts` logic in `artifacts/saas` without prior discussion.

# System Architecture

The project is structured as a pnpm workspace monorepo using Node.js 24 and TypeScript 5.9.

## Core Stack

-   **Monorepo Tool**: pnpm workspaces
-   **API Framework**: Express 5
-   **Database**: PostgreSQL with Drizzle ORM
-   **Validation**: Zod (`zod/v4`), integrated with `drizzle-zod`
-   **API Codegen**: Orval (generates from OpenAPI spec)
-   **Build Tool**: esbuild (for CJS bundles)

## Monorepo Structure

The monorepo is organized into `artifacts/` for deployable applications and `lib/` for shared libraries.

-   `artifacts/`: Contains `api-server`, `saas` (web app), and `mobile` (Expo app).
-   `lib/`: Includes `api-spec`, `api-client-react` (generated React Query hooks), `api-zod` (generated Zod schemas), and `db` (Drizzle ORM setup).
-   `scripts/`: A dedicated package for utility scripts.

## TypeScript Configuration

All packages extend a base `tsconfig.base.json` with `composite: true`. The root `tsconfig.json` manages project references, enabling root-level typechecking and ensuring correct cross-package import resolution. `emitDeclarationOnly` is used for `.d.ts` generation, with `esbuild` handling actual JavaScript bundling.

## Applications

### CleanCalc Pro Web SaaS (`artifacts/saas`)

-   **Purpose**: Full-featured web application for commercial cleaning companies, primarily for the German market.
-   **UI/UX**: Mobile-first design using React, Vite, and Tailwind CSS v4. Features a light default theme (light gray bg, white cards, teal primary #0F766E) with optional dark mode via `.dark` class on `<html>`. Design tokens in `src/lib/tokens.ts` (typography, spacing, radius). Inter font.
-   **Data Management**: Dual-path data handling with Supabase for authenticated users (PostgreSQL backend) and Zustand with localStorage for demo mode.
-   **Calculation Engine**: Room-based cost calculation with 125 default room types across 16 groups (BIV/RAL-based Leistungswerte), Zu-/Abschläge system (Verschmutzungsgrad, Möblierungsgrad, Bodenbelag) that adjusts effective performance values, and configurable hourly rate. Core formula: `area / effectivePerf * frequencyFactor * hourlyRate`.
-   **Verrechnungssatz-Kalkulator**: Professional hourly rate calculator at `#/stundensatz` with 5-step cost buildup: Basislohn (Tariflohn LG1 €15/h, Minijob/Teilzeit/Vollzeit) → SV AG-Anteil → Ausfallzeiten (Bundesland-based Feiertage) → Gemeinkosten → Gewinnmarge = Verrechnungssatz. Config stored in `hourlyRateConfig` (Zustand, store v4). Engine in `src/lib/hourly-rate-calc.ts`, Bundesland data in `src/data/bundeslaender.ts`.
-   **Room Types Data**: `src/data/room-types.ts` — 16 groups (Büro, Sanitär, Verkehrsflächen, Küche/Sozial, Lager/Technik, Medizin/Labor, Sonderflächen, Schule/Bildung, Hotel/Gastronomie, Einzelhandel, Industrie/Produktion, Öffentliche Gebäude, Pflege/Seniorenheim, Freizeit/Sport, Verkehr/Logistik, Wohnungswirtschaft). Surcharges defined in `src/data/surcharges.ts`.
-   **Branchensprache**: App uses professional German cleaning industry terminology throughout — "Verrechnungssatz" (not "Stundensatz"), "Controlling" (not "Auswertung"), "Monatsumsatz geplant" (not "Monatsvolumen"), "Angebot als PDF" (not "PDF exportieren"). Dashboard shows business KPIs (Monatsumsatz, Ø Marge, Std/Monat, Verrechnungssatz, Objekte, €/m²).
-   **Responsive Layout**: Desktop-optimized (768px+) with `AppShell` wrapper providing a fixed left sidebar (`DesktopSidebar`, w-64) and hidden bottom nav. Mobile retains bottom nav (`BottomNav`, md:hidden). Navigation: 5 tabs — Start(/), Kalkulation(/stundensatz), Objekte(/objekte), Controlling(/auswertung), Mehr(/mehr). The "Mehr" page is a hub linking to Einstellungen, Konto, Vorlagen, Upgrade, theme toggle, and legal pages. Content areas use `max-w-6xl` (dashboard/objekte/auswertung) or `max-w-5xl` (einstellungen/kalkulation/konto/mehr). Bottom-sheets convert to centered dialogs on desktop. Einstellungen uses 2-column grid on desktop.
-   **Routing**: Hash-based routing using `wouter` for `#/path` URLs.
-   **Go-to-Market Funnel**: Public marketing landing page at `#/willkommen` (`src/pages/willkommen.tsx`) is the top of the acquisition funnel and the first screen new visitors see (AuthGuard redirects first-time, unauthenticated users there instead of the old auto-redirecting splash). Conversion-focused sections: hero with value proposition, trust/stats bar, problem→solution, feature grid, 3-step how-it-works, pricing (Free vs. Pro, pulled live from `billing-config`), FAQ, mid-funnel e-mail/lead capture, and final CTA. CTAs route into onboarding (`#/onboarding`) or registration (`#/register`). Built entirely with the existing stack (no new dependencies), dark-mode aware via design tokens, and lazy-loaded as its own chunk. Funnel stages are instrumented end-to-end via analytics events (landing → lead → onboarding → signup → activation).
-   **Lead Capture**: `src/services/lead-service.ts` captures e-mail leads from the landing page. Delivery order: pluggable external provider (`setLeadProvider()`, e.g. Mailchimp/Brevo) → Supabase `leads` table (`migrations/002_leads.sql`, anon-insert RLS) → localStorage fallback. Always fires `lead_captured` and never throws to the UI.
-   **Performance**: Route-level code-splitting via `React.lazy` + `Suspense` (all pages except the eager `home` are separate chunks) and `manualChunks` vendor splitting in `vite.config.ts` (`react-vendor`, `framer`, `charts`, `supabase`, `icons`, `radix`). This breaks the previously monolithic ~1.1 MB bundle apart and removes recharts (~320 KB) from the initial load (only loaded on report pages).
-   **SEO & PWA**: `index.html` carries full SEO/social metadata (description, Open Graph, Twitter Card, JSON-LD `SoftwareApplication`, theme-color), and the app is installable via `public/site.webmanifest` (+ `public/robots.txt`).
-   **Testing**: Vitest unit suite covering the core business logic — `lib/calc` (room/project totals, surcharge-adjusted performance, division-by-zero guards, Rüstzeit/Wegezeit), `lib/hourly-rate-calc` (full Verrechnungssatz cost chain, SV rates, downtime guard), `data/surcharges`, `lib/utils`, `lib/billing-config`, and `services/lead-service`. Run with `pnpm --filter @workspace/saas test` (or workspace-wide `pnpm test`). Standalone `vitest.config.ts` (node env, `@` alias) so tests don't need the app's PORT/BASE_PATH env.
-   **Component decomposition**: Large stateful pages are split into a thin state/orchestration parent plus pure presentational subcomponents (props-only): the calculation wizard (`pages/kalkulation-wizard/` — 8 step components) and the Verrechnungssatz calculator (`pages/kalkulation/` — step cards + reusable `NumberInput`/`InfoPopover`/`Section`). All state, effects, calculations and persistence stay in the parent; behavior is unchanged.
-   **Design-system primitives**: Shared, accessible building blocks in `components/ui/` — `PageHeader`, `SectionHeading`, `StatTile` (KPI card), and `FormField` (label+control+error wired via `htmlFor`/`id`/`aria-invalid`/`aria-describedby`). `src/index.css` is the single source of truth for tokens (colors/spacing/radius/typography); hardcoded color shades were replaced with semantic tokens that adapt to dark mode.
-   **Accessibility**: `MotionConfig reducedMotion="user"` (respects `prefers-reduced-motion`), base-layer keyboard `:focus-visible` outlines, a skip-to-content link + `<main>` landmark in the AppShell, `aria-current` on active nav, labelled forms with announced errors, and `role="dialog"`/Escape on hand-rolled modals. Robust import validation in the store guards against corrupt data files.
-   **Data import safety**: `store.importData()` validates field types and the `hourlyRateConfig`/`projects`/`templates` shapes before applying, so malformed JSON imports cannot corrupt app state.
-   **Authentication**: Supabase-based authentication (email/password) with session persistence, password reset, and email confirmation. AuthGuard manages redirects based on user state (splash, onboarding, home).
-   **Feature Gates**: Implements plan-based feature gates (Basic vs. Pro) limiting projects, rooms per project, PDF export, and template usage.
-   **State Management**: Zustand with localStorage persistence (`cleancalc-storage`, version 11). Theme stored in state as `"light" | "dark"` with ThemeApplicator component in App.tsx.
-   **Service Layer**: Clean service architecture with `auth-service`, `company-service`, `object-service`, `room-service`, `template-service`, `custom-room-type-service`, `settings-service`, `profile-service`, `plan-service`, `migration-service`, `analytics-service`, `founding-offer-service`. Pages access services via `use-store-actions` hook (bridges Zustand store + Supabase API).
-   **Analytics**: Provider-agnostic analytics service (`src/services/analytics-service.ts`) with predefined event types covering the full acquisition/activation funnel (`landing_viewed`, `landing_cta_clicked`, `onboarding_started/completed/skipped`, `signup_started/completed`, `activation_first_object/first_calculation`) plus paywall views, upgrade triggers, subscription starts, and free-limit events. Console logging in dev mode, pluggable provider via `setAnalyticsProvider()`. Ready-made provider integrations in `src/services/analytics-providers.ts` (initialized in `main.tsx`) activate automatically when configured via build env: Plausible (`VITE_PLAUSIBLE_DOMAIN`, optional `VITE_PLAUSIBLE_SRC`) or Google Analytics 4 (`VITE_GA_MEASUREMENT_ID`) — both loaded by script injection, no extra npm dependency.
-   **Billing/Plans**: Plan system with `PlanId = "free" | "pro_monthly" | "pro_annual" | "founding_annual" | "business"`. Feature gates in `feature-gates.ts`, billing config in `billing-config.ts`. Founding offer service manages limited-slot pricing. Konto page shows subscription management for paid users.
-   **UX Components**: Toast notifications (Sonner, German), confirm dialogs for all destructive actions, loading skeletons (list/card/detail), error boundary, network error states, empty states with CTAs, 404 page, session expiry detection. All user-facing messages in German.
-   **Capacitor Integration**: Supports native builds for iOS/Android using Capacitor, with specific adaptations for storage, sharing, deep linking, and native back button handling.

### Reinigungskalkulator Mobile App (`artifacts/mobile`)

-   **Purpose**: German-language mobile app for maintenance cleaning quote calculations.
-   **Technology**: Built with Expo Router (React Native).
-   **Features**: Three main tabs (Kalkulation, Auswertung, Einstellungen), room management (add/edit/delete), automatic calculation of hours/costs, KPI display, editable project settings, custom room types, demo data, dark mode UI.
-   **Data Storage**: Client-side data persistence using AsyncStorage; no backend dependency.

### API Server (`artifacts/api-server`)

-   **Purpose**: Provides backend API services for the applications.
-   **Technology**: Express 5.
-   **Architecture**: Routes are defined in `src/routes/` and utilize `@workspace/api-zod` for request/response validation and `@workspace/db` for database interactions. CORS and JSON/urlencoded parsing are configured.

## Libraries

### `lib/db`

-   **Purpose**: Database abstraction layer.
-   **Technology**: Drizzle ORM with PostgreSQL.
-   **Schema**: Defines database schemas and exports a Drizzle client. `drizzle-zod` is used for schema-based validation.

### `lib/api-spec`

-   **Purpose**: Manages the OpenAPI 3.1 specification and Orval configuration.
-   **Functionality**: Used to generate API client code and Zod schemas into sibling packages.

### `lib/api-zod`

-   **Purpose**: Stores generated Zod schemas from the OpenAPI spec for API request and response validation.

### `lib/api-client-react`

-   **Purpose**: Stores generated React Query hooks and a fetch client from the OpenAPI spec for frontend API interaction.

# External Dependencies

-   **PostgreSQL**: Primary database for the API server and Supabase.
-   **Supabase**: Backend-as-a-Service for authentication, real-time database, and storage for the `saas` application. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for configuration.
-   **Drizzle ORM**: TypeScript ORM for interacting with PostgreSQL.
-   **Zod**: Schema declaration and validation library.
-   **Orval**: OpenAPI client code generator.
-   **Express**: Web application framework for Node.js (API server).
-   **React**: Frontend library for `saas` web app.
-   **Vite**: Build tool for the `saas` web app.
-   **Tailwind CSS**: Utility-first CSS framework for `saas` web app.
-   **Framer Motion**: Animation library used in `saas` web app.
-   **Zustand**: Small, fast, and scalable bearbones state-management solution for `saas` web app.
-   **Lucide React**: Icon library for `saas` web app.
-   **Wouter**: Tiny React hook-based router for `saas` web app.
-   **shadcn/ui**: Reusable UI components for `saas` web app.
-   **Sonner**: Toast library for `saas` web app.
-   **@supabase/supabase-js**: JavaScript client library for Supabase.
-   **Expo Router**: File-system based router for React Native apps (`mobile`).
-   **React Native**: Framework for building native mobile apps.
-   **Capacitor**: Open-source cross-platform native runtime for web apps (`saas` native build).
-   **AsyncStorage**: Persistent data storage for React Native (`mobile` app).
-   **@capacitor/preferences**: Capacitor plugin for native preferences storage.
-   **@capacitor/share**: Capacitor plugin for native sharing functionality.
-   **@capacitor/app**: Capacitor plugin for app lifecycle events.