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
-   **UI/UX**: Mobile-first design using React, Vite, and Tailwind CSS v4. Features a dark premium theme (muted teal, dark background) and Inter font.
-   **Data Management**: Dual-path data handling with Supabase for authenticated users (PostgreSQL backend) and Zustand with localStorage for demo mode.
-   **Calculation Engine**: Room-based cost calculation with 125 default room types across 16 groups (BIV/RAL-based Leistungswerte), Zu-/Abschläge system (Verschmutzungsgrad, Möblierungsgrad, Bodenbelag) that adjusts effective performance values, and configurable hourly rate. Core formula: `area / effectivePerf * frequencyFactor * hourlyRate`.
-   **Verrechnungssatz-Kalkulator**: Professional hourly rate calculator at `#/stundensatz` with 5-step cost buildup: Basislohn (Tariflohn LG1 €15/h, Minijob/Teilzeit/Vollzeit) → SV AG-Anteil → Ausfallzeiten (Bundesland-based Feiertage) → Gemeinkosten → Gewinnmarge = Verrechnungssatz. Config stored in `hourlyRateConfig` (Zustand, store v4). Engine in `src/lib/hourly-rate-calc.ts`, Bundesland data in `src/data/bundeslaender.ts`.
-   **Room Types Data**: `src/data/room-types.ts` — 16 groups (Büro, Sanitär, Verkehrsflächen, Küche/Sozial, Lager/Technik, Medizin/Labor, Sonderflächen, Schule/Bildung, Hotel/Gastronomie, Einzelhandel, Industrie/Produktion, Öffentliche Gebäude, Pflege/Seniorenheim, Freizeit/Sport, Verkehr/Logistik, Wohnungswirtschaft). Surcharges defined in `src/data/surcharges.ts`.
-   **Branchensprache**: App uses professional German cleaning industry terminology throughout — "Verrechnungssatz" (not "Stundensatz"), "Controlling" (not "Auswertung"), "Monatsumsatz geplant" (not "Monatsvolumen"), "Angebot als PDF" (not "PDF exportieren"). Dashboard shows business KPIs (Monatsumsatz, Ø Marge, Std/Monat, Verrechnungssatz, Objekte, €/m²).
-   **Routing**: Hash-based routing using `wouter` for `#/path` URLs.
-   **Authentication**: Supabase-based authentication (email/password) with session persistence, password reset, and email confirmation. AuthGuard manages redirects based on user state (splash, onboarding, home).
-   **Feature Gates**: Implements plan-based feature gates (Basic vs. Pro) limiting projects, rooms per project, PDF export, and template usage.
-   **State Management**: Zustand with localStorage persistence (`cleancalc-storage`, version 3).
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