# Contract Lead Finder

A comprehensive lead management and analytics platform for tracking federal contract opportunities from SAM.gov. Designed to help businesses discover, manage, and close government contracts efficiently.

## Run & Operate

### Starting the Application

- `pnpm --filter @workspace/api-server run dev` — Start the API server (port 5000)
- `pnpm --filter @workspace/contract-leads run dev` — Start the frontend dev server (port 5173)
- `pnpm run typecheck` — Run full TypeScript typecheck across all packages
- `pnpm run build` — Build all packages with typechecking
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — Push database schema changes to PostgreSQL (dev only)

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/contract_leads

# Email (for deadline reminders)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com

# SAM.gov API
SAM_GOV_API_KEY=your-sam-gov-api-key

# Optional: for production deployments
NODE_ENV=production
API_PORT=5000
```

## Stack

| Component | Technology |
|-----------|-----------|
| **Monorepo** | pnpm workspaces, Node.js 24 |
| **Language** | TypeScript 5.9 |
| **API Server** | Express 5, Drizzle ORM |
| **Database** | PostgreSQL with Drizzle ORM |
| **Frontend** | React 19, Vite 7 |
| **Styling** | Tailwind CSS 4, Shadcn/UI |
| **Validation** | Zod v3, drizzle-zod |
| **API Codegen** | Orval (from OpenAPI spec) |
| **Build** | esbuild (production bundles) |
| **UI Extras** | Recharts (analytics), @dnd-kit (drag-and-drop) |
| **Export** | jsPDF, jspdf-autotable |
| **Notifications** | nodemailer, node-cron |

## Where Things Live

### Core Packages

| Package | Location | Purpose |
|---------|----------|---------|
| **api-server** | `artifacts/api-server/` | Express backend, API routes, business logic |
| **contract-leads** | `artifacts/contract-leads/` | React frontend, dashboard, UI components |
| **api-spec** | `artifacts/api-spec/` | OpenAPI specification (source of truth for API) |
| **api-client-react** | `artifacts/api-client-react/` | Auto-generated React hooks for API calls |
| **api-zod** | `artifacts/api-zod/` | Auto-generated Zod schemas from OpenAPI |
| **db** | `artifacts/db/` | Drizzle ORM schema, migrations, seed scripts |

### Key Source Files

- **Database Schema**: `artifacts/db/src/schema.ts` — Lead, Note, LeadNote entity definitions
- **API Routes**: `artifacts/api-server/src/routes/` — CRUD endpoints for leads, notes, analytics
- **Frontend Pages**: `artifacts/contract-leads/src/pages/` — Dashboard, Leads, Analytics, Import
- **OpenAPI Spec**: `artifacts/api-spec/openapi.yaml` — API contract (generates client code)

## Architecture Decisions

1. **Monorepo Structure**: Uses pnpm workspaces to share code between API and frontend, reducing duplication and improving consistency.

2. **API-First Design**: OpenAPI specification is the source of truth. Client code (Zod schemas, React hooks) is auto-generated from the spec, ensuring frontend/backend alignment.

3. **Database-First Validation**: Drizzle ORM with Zod schemas provide type-safe validation at both database and API layers.

4. **Scheduled Tasks**: node-cron runs deadline reminder emails daily on a cron schedule; no external job service required.

5. **SAM.gov Integration**: Separate service for federal contract discovery; leads are imported into local database for offline access and analytics.

6. **Supply Chain Security**: pnpm enforces a 1-day minimum age for npm packages to prevent supply-chain attacks (exceptions for Replit & trusted vendors).

## Product

### Core Features

- **Lead Management**
  - Create, read, update, delete contract leads
  - Capture contact information (name, email, phone)
  - Track lead status (New, In Progress, Won, Lost)
  - Record close reasons (won/lost analysis)
  - Add timestamped notes for lead history

- **SAM.gov Integration**
  - Search federal contract opportunities
  - One-click import into application
  - Automatic metadata capture (issuer, deadline, category, value)

- **Notifications & Reminders**
  - Daily email alerts for contracts due within 7 days
  - Urgency indicators on dashboard (pulsing badges)
  - Deadline badge in sidebar navigation

- **Analytics & Reporting**
  - Win/loss ratio charts
  - Pipeline value by category
  - Leads by status breakdown
  - Conversion funnel visualization
  - Top wins leaderboard (ranked by contract value)
  - Win/loss reason insights

- **Data Management**
  - Multiple views: table and Kanban board (drag-and-drop)
  - Inline editing of lead details
  - Export to CSV or PDF

## User Preferences

### Database Setup

1. Create PostgreSQL database:
   ```sql
   CREATE DATABASE contract_leads;
   ```

2. Push schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```

3. Verify connection:
   ```bash
   psql postgresql://user:password@localhost/contract_leads -c "SELECT version();"
   ```

### Email Configuration

For Gmail (recommended for testing):
1. Enable 2-factor authentication on Gmail
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password as `SMTP_PASS` in `.env`

For other providers, consult nodemailer documentation.

### SAM.gov API Setup

1. Create an account at https://api.sam.gov
2. Generate an API key from account settings
3. Add to `SAM_GOV_API_KEY` environment variable

### TypeScript Builds

- Always run `pnpm run typecheck` before committing to catch type errors early
- Each package has its own `tsconfig.json` for modular type checking
- Use `pnpm run build` for production-ready bundles

## Gotchas

### Database Migrations

- Changes to `artifacts/db/src/schema.ts` require running `pnpm --filter @workspace/db run push`
- **WARNING**: This modifies the production database if `DATABASE_URL` points to production
- Always backup production database before pushing schema changes

### API Spec Regeneration

- After modifying `artifacts/api-spec/openapi.yaml`, run:
  ```bash
  pnpm --filter @workspace/api-spec run codegen
  ```
- This regenerates:
  - `@workspace/api-client-react` (React hooks)
  - `@workspace/api-zod` (Zod validation schemas)
- Commit the generated files; they are part of the source tree

### Environment Variables in Production

- **DO NOT** commit `.env.local` files to Git
- Use Replit Secrets or deployment platform's secret management
- Verify all required variables are set before deploying:
  - `DATABASE_URL` (required)
  - `SAM_GOV_API_KEY` (required for SAM.gov import)
  - Email variables (required if deadline reminders are needed)

### Node Version

- Project requires **Node.js 24+**
- TypeScript 5.9+ required for latest syntax features
- Use `node --version` to verify

### Package Manager

- **Must use pnpm** (enforced via `preinstall` script in root `package.json`)
- Installing with npm or yarn will fail intentionally

### Supply Chain Security

- pnpm blocks packages released less than 1 day ago to prevent supply-chain attacks
- Only Replit packages (@replit/*) and stripe-replit-sync are excluded
- If you need to bypass this for a new security patch, add to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` (temporary only)

## Pointers

- **Monorepo**: See pnpm-workspace skill for package structure and dependency management
- **Database**: Drizzle ORM docs at https://orm.drizzle.team
- **API Generation**: Orval docs at https://orval.dev
- **Frontend Components**: Shadcn/UI at https://ui.shadcn.com
- **Data Viz**: Recharts at https://recharts.org
- **Production Deployment**: Replit documentation and secrets management
