# System Design Park

A React + TypeScript + Vite practice app for system design interview prep. The project ships with a seeded library of interview-style prompts across social, storage, collaboration, commerce, infrastructure, AI, and other domains.

## Features

- 60+ seeded system design problems with `Easy`, `Medium`, and `Hard` difficulty labels
- Search, category, difficulty, and status filtering
- Random drill button for interview practice
- Bookmark and practiced state synced to Postgres for signed-in users, with browser fallback for guests
- Detail panel with scale targets, design focus areas, pitfalls, and follow-up variants
- A six-stage interview playground for requirements, entities, interfaces, data flow, high-level design, and deep dives
- Per-problem practice sessions synced to Postgres for signed-in users, with browser fallback for guests

## Project structure

- `src/features/problem-library/` contains the feature module: typed models, filtering and sorting logic, persistence hooks, and UI components
- `src/features/practice-playground/` contains the guided practice workspace and per-problem saved notes
- `src/data/problemLibrary.ts` contains the curated prompt library
- `src/shared/ui/` contains reusable presentational primitives
- `src/styles/app.css` contains the application styling

## Run locally

```bash
npm install
npm run dev
```

## Environment configuration

The frontend uses Vite environment files. Only variables prefixed with `VITE_`
are exposed to the browser bundle.

- `.env.development` contains checked-in local defaults.
- `.env.production` contains checked-in production defaults.
- `.env.local` is ignored by git and can override values on a developer machine.
  Copy `.env.local.example` to `.env.local` when local overrides are needed.
- Production hosts should set real secret-adjacent values, such as Auth0 IDs, in
  the deployment provider environment instead of committing them.

Useful scripts:

```bash
npm run dev:local
npm run build:local
npm run build:prod
```

Feature flags can be toggled per environment:

```bash
VITE_ENABLE_AUTH=true
VITE_ENABLE_BILLING=true
VITE_ENABLE_ONBOARDING=true
VITE_ENABLE_AI_REVIEW=true
VITE_ENABLE_DEVELOPMENT_NOTICE=true
```

## Auth0 configuration

The custom auth screens use Auth0 for credential handling and callbacks.

```bash
VITE_AUTH0_DOMAIN=your-tenant.region.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=your-api-audience
VITE_AUTH0_CONNECTION=Username-Password-Authentication
```

Set `VITE_AUTH0_CONNECTION` to the database connection that should receive
password reset requests.

## Type-check and build

```bash
npm run typecheck
npm run build
```
