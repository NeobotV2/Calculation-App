# CleanCalc Pro - Gebäudereinigung Kalkulation

Professional cleaning service calculation app for German building cleaning companies. Calculate hourly rates, manage cleaning objects, rooms, and generate PDF quotes.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm --filter saas dev
```

The app runs at the path configured in `artifact.toml` (default: `/saas/`).

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | For cloud mode |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | For cloud mode |

Without Supabase credentials, the app runs in **Demo Mode** with local storage only.

## Supabase Connection Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration SQL files in `src/lib/migrations/` against your Supabase database in order
3. Set the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Restart the dev server

### Database Tables

- `companies` - Company profiles
- `profiles` - User profiles linked to companies
- `company_settings` - Hourly rate, VAT, PDF settings, company address
- `cleaning_objects` - Cleaning project/object definitions
- `rooms` - Rooms within cleaning objects
- `templates` - Reusable room templates
- `custom_room_types` - User-defined room types with performance values
- `subscriptions` - Plan/subscription tracking (basic/pro)

## Authentication

The app uses **Supabase Auth** with email/password authentication.

### Testing Auth

1. Register a new account via the registration page
2. Confirm email (check Supabase dashboard for email logs in development)
3. Log in with confirmed credentials
4. Session persists via Supabase JWT tokens with auto-refresh
5. Expired sessions are detected and the user is notified with a toast message

### Auth Flow

- `/splash` - Initial splash screen (shown once)
- `/onboarding` - Company setup wizard (name, role, hourly rate)
- `/login` - Email/password login
- `/register` - New account registration
- `/passwort-vergessen` - Password reset request
- `/passwort-reset` - Password reset form (via email link)

## Demo Mode

When Supabase is not configured or the user skips login:

- All data is stored locally via Zustand + localStorage (or Capacitor Storage on mobile)
- Demo projects are created during onboarding if selected
- A warning banner appears on the profile page
- Data migration is offered when a demo user later registers/logs in
- Feature gates still apply (Basic plan limits)

## Plans & Feature Gates

### Basic Plan (Free)
- Maximum 3 active objects
- Maximum 20 rooms per object
- Standard room types only
- In-app viewing only

### Pro Plan
- Unlimited objects and rooms
- PDF quote generation and export
- Custom room types with custom performance values
- Individual performance value overrides per room
- Templates for reusable room configurations
- Cloud synchronization

### Feature Gate Implementation

Feature gates are defined in `src/lib/feature-gates.ts` and checked before gated actions:

- `canAddProject()` - Checks active project count against plan limit
- `canAddRoom(projectId)` - Checks room count per project
- `canUsePDF()` - Checks PDF export access
- `canUseTemplates()` - Checks template access
- `canOverridePerformance()` - Checks custom performance value access

When a limit is hit, an upgrade modal (`UpgradeModal`) appears with plan comparison and upgrade CTA. The upgrade action is currently a placeholder that will be replaced by RevenueCat in-app purchase.

## PDF / Print-to-PDF

### How It Works

1. Navigate to an object detail page (`/objekte/:id`)
2. Open the action menu (three dots) and select "Angebot als PDF"
3. The print view (`/print/:id`) renders a clean, printer-friendly layout
4. Click "Drucken / PDF" to trigger the browser print dialog
5. On native (Capacitor), the "Teilen" button uses native share sheet

### Testing Print-to-PDF

1. Create an object with at least one room
2. Navigate to the print view via the object's action menu
3. Use browser print (Ctrl+P / Cmd+P) and select "Save as PDF"
4. Verify: company header, room table, totals, VAT calculation, footer

### PDF Customization

In Settings (`/einstellungen`):
- Company name, address, phone, email (auto-included in header)
- Tax number and VAT ID (included in footer)
- Managing director name
- Optional header/footer text lines
- VAT rate (0 = no VAT displayed)

## Project Structure

```
src/
  App.tsx                    # Root component, routing, auth guard
  main.tsx                   # Entry point

  components/
    layout/
      BottomNav.tsx          # Fixed bottom navigation bar
      PageTransition.tsx     # Framer Motion page transition wrapper
      AppFooter.tsx          # Legal links footer
    ui/                      # shadcn/ui components
    confirm-dialog.tsx       # Reusable confirmation dialog
    empty-state.tsx          # Reusable empty state component
    error-boundary.tsx       # React error boundary (German)
    list-skeleton.tsx        # Loading skeleton components
    network-error.tsx        # Network error state component
    room-editor-sheet.tsx    # Room add/edit bottom sheet
    upgrade-modal.tsx        # Plan upgrade modal

  data/
    room-types.ts            # Default room type definitions
    surcharges.ts            # Soiling/furnishing/floor surcharge definitions
    bundeslaender.ts         # German states data

  hooks/
    use-android-back.ts      # Android back button handling
    use-hydrated.ts          # Zustand hydration state hook
    use-mobile.tsx           # Mobile detection hook
    use-store-actions.ts     # Service layer bridge (store + Supabase)
    use-supabase-sync.ts     # Supabase data synchronization hook
    use-toast.ts             # Toast notification hook

  lib/
    auth-context.tsx         # Supabase auth provider + hooks
    auth-callback.ts         # OAuth callback handler
    calc.ts                  # Room/project calculation logic
    capacitor.ts             # Capacitor native bridge utilities
    capacitor-storage.ts     # Capacitor storage adapter for Zustand
    feature-gates.ts         # Plan-based feature access checks
    hourly-rate-calc.ts      # Detailed hourly rate calculator
    native-share.ts          # Native share sheet integration
    supabase.ts              # Supabase client initialization
    utils.ts                 # Utility functions (formatting, etc.)
    warnings.ts              # Project warning/alert system

  pages/
    home.tsx                 # Dashboard with KPIs and quick actions
    objekte/
      index.tsx              # Object list with search, filter, sort
      [id].tsx               # Object detail with rooms
      wizard.tsx             # New object creation wizard
    auswertung/
      index.tsx              # Global controlling/analytics
      [id].tsx               # Per-object controlling detail
    print/[id].tsx           # Print/PDF view for quotes
    vorlagen.tsx             # Template management (Pro)
    einstellungen.tsx        # Settings (company, calc, rooms, PDF, data)
    kalkulation.tsx          # Hourly rate calculator
    konto.tsx                # Profile, plan, account management
    upgrade.tsx              # Pro plan upgrade page
    login.tsx                # Login page
    register.tsx             # Registration page
    passwort-vergessen.tsx   # Password reset request
    passwort-reset.tsx       # Password reset form
    onboarding.tsx           # Initial onboarding wizard
    splash.tsx               # Splash screen
    not-found.tsx            # 404 page
    impressum.tsx            # Legal: Imprint
    datenschutz.tsx          # Legal: Privacy policy
    agb.tsx                  # Legal: Terms of service

  services/
    auth-service.ts          # Authentication operations
    company-service.ts       # Company CRUD operations
    object-service.ts        # Cleaning object CRUD + room operations
    room-service.ts          # Room CRUD operations
    template-service.ts      # Template CRUD operations
    custom-room-type-service.ts  # Custom room type operations
    settings-service.ts      # Company settings operations
    profile-service.ts       # User profile operations
    plan-service.ts          # Subscription/plan checks
    migration-service.ts     # Demo-to-cloud data migration

  store/
    use-store.ts             # Zustand store (state + actions)

  types/
    index.ts                 # Shared TypeScript type exports
```

## Technology Stack

- **Framework**: React 18 + Vite
- **Routing**: Wouter (hash-based)
- **State Management**: Zustand with localStorage persistence
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion
- **Backend**: Supabase (Auth, PostgreSQL, REST API)
- **Mobile**: Capacitor (iOS/Android wrapper)
- **Icons**: Lucide React
- **Toasts**: Sonner
