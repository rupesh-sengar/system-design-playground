# Backend

Express + TypeScript backend for the System Design Platform. The initial AI stack uses Google ADK with Gemini and exposes structured APIs for frontend feedback and hint generation.

## Endpoints

- `GET /healthz`
- `POST /v1/ai/validate-design`
- `POST /v1/ai/generate-hints`
- `GET /v1/persistence/problem-progress`
- `PUT /v1/persistence/problem-progress/:problemId`
- `DELETE /v1/persistence/problem-progress`
- `GET /v1/persistence/practice-sessions/:problemId`
- `PUT /v1/persistence/practice-sessions/:problemId`
- `DELETE /v1/persistence/practice-sessions/:problemId`
- `GET /v1/editorials/:problemId/:stageId`
- `PUT /v1/editorials/:problemId/:stageId`

`/v1/ai/*`, `/v1/persistence/*`, and `/v1/editorials/*` expect a valid Auth0 bearer token when `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are configured. Editorial reads require `read:all` or `commitly:readall`; editorial writes require `create:all` or `commitly:writeall`.

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The service can boot without an API key, but AI routes will return `503` until `GEMINI_API_KEY` or `GOOGLE_API_KEY` is configured.

Persistent storage routes also require `DATABASE_URL`.

Judge reference embedding seeding requires Postgres with `pgvector` and one embedding provider. Use Gemini with `GEMINI_API_KEY` or `GOOGLE_API_KEY`, or set `EMBEDDING_PROVIDER=ollama` for local/offline seeding with a model that matches the 768-dimensional vector table, such as `nomic-embed-text`.

## Auth0 JWT validation

Set these env vars to protect the AI routes with Auth0:

```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
AUTH0_REQUIRED_SCOPE=read:ai
DATABASE_URL=postgres://...
```

If `AUTH0_REQUIRED_SCOPE` is provided, the token must include that scope as well.

## Postgres schema

Postgres migrations live in `db/migrations`.

`001_initial_postgres_schema.sql` creates:

- `app_users`
- `user_problem_progress`
- `practice_sessions`
- `practice_stage_drafts`

`002_judge_reference_vectors.sql` creates `judge_reference_chunks` for preferred-solution embeddings and enables `pgvector`.

`003_practice_stage_diagrams.sql` adds `diagram_json` for saved drawpad diagrams.
`004_stage_editorials.sql` creates `stage_editorials` for protected per-problem, per-stage editorial content.

Apply them with:

```bash
cd backend
psql "$DATABASE_URL" -f db/migrations/001_initial_postgres_schema.sql
psql "$DATABASE_URL" -f db/migrations/002_judge_reference_vectors.sql
psql "$DATABASE_URL" -f db/migrations/003_practice_stage_diagrams.sql
psql "$DATABASE_URL" -f db/migrations/004_stage_editorials.sql
```

## Judge embeddings

Preferred solution chunks are generated from the full frontend problem catalog and the curated judge rubrics.

Seed or refresh their embeddings with:

```bash
cd backend
npm run seed:judge-embeddings
```

To avoid Gemini quota limits, seed with Ollama:

```bash
cd backend
ollama pull nomic-embed-text
EMBEDDING_PROVIDER=ollama npm run seed:judge-embeddings
```

The seed covers every problem and all six stages, then replaces `judge_reference_chunks` so stale vectors do not survive rubric changes.

## Stage editorials

Stage editorials are stored in Postgres and served through protected `/v1/editorials/*` routes. Seed them after applying `004_stage_editorials.sql`:

```bash
cd backend
npm run seed:stage-editorials
```

The seed creates one editorial for every catalog problem and each of the six practice stages.

## ADK dev UI

```bash
cd backend
npm run adk:web
```
