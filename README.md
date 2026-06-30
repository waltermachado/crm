# Axe CRM

Production-ready enterprise CRM baseline built with Next.js 15, App Router, TypeScript, Tailwind CSS v4, shadcn/ui, and Prisma for Supabase PostgreSQL.

## Stack

- Next.js 15 with App Router and React Server Components by default
- TypeScript with strict routing and typed domain contracts
- Tailwind CSS v4 and shadcn/ui for modular design system primitives
- Prisma ORM configured for Supabase pooled runtime connections and direct schema operations
- Zod-backed environment parsing, structured logging, and route-level error boundaries
- Vitest baseline tests for placeholder dashboard contracts and shared formatting utilities

## Project Structure

```text
src/
  app/
    (dashboard)/
    actions/
  components/
    dashboard/
    layout/
    ui/
  lib/
    dashboard/
    db/
    env/
    errors/
    logger/
    utils/
  types/
prisma/
supabase/
```

## Environment Variables

Copy `.env.example` to `.env.local` and provide valid values:

```bash
cp .env.example .env.local
```

- `DATABASE_URL`: Supabase pooler or PgBouncer connection used at runtime
- `DIRECT_URL`: direct PostgreSQL connection used by Prisma migrations and schema operations
- `NEXT_PUBLIC_APP_NAME`: optional public application name
- `LOG_LEVEL`: one of `debug`, `info`, `warn`, or `error`
- `APP_URL`: public base URL used to build Google OAuth callback URLs
- `GOOGLE_CLIENT_ID`: Google OAuth client id for Calendar integration
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret for Calendar integration
- `INTEGRATION_ENCRYPTION_KEY`: encryption key used to protect stored external credentials and tokens

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run deploy
npm run check
npm run test
npm run cf-typegen
npm run prisma:generate
npm run prisma:migrate:dev
```

## Cloudflare Workers

This project is prepared to deploy on Cloudflare Workers using the OpenNext adapter.

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment files:

```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

3. Authenticate Wrangler:

```bash
npx wrangler login
```

4. Preview the Workers runtime locally:

```bash
npm run preview
```

5. Deploy:

```bash
npm run deploy
```

### Notes

- `wrangler.jsonc` is configured with `nodejs_compat`, which is required for OpenNext on Cloudflare Workers.
- Set the production secrets in Cloudflare before deploying, including `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_NAME`, and `LOG_LEVEL`.
- Do not commit `.env*`, `.dev.vars*`, `.next`, or `.open-next`.

## Current Baseline

- Responsive CRM dashboard shell with collapsible sidebar
- Placeholder metric cards for contacts, companies, revenue, and support tickets
- Kanban-style deals pipeline placeholder
- Recent activities feed
- Sample Server Action form for secure submissions
- Error boundaries and logging foundations
- Prisma schema prepared for tenant-aware, RLS-friendly expansion
# crm
# crm
