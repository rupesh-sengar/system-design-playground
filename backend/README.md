# Backend

Express + TypeScript backend for the System Design Platform. The AI stack uses DeepSeek for coaching and optional structured validation, with a rule-engine validation fallback.

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
- `GET /v1/billing/me`
- `POST /v1/billing/checkout-session`
- `POST /v1/billing/verify-subscription`
- `POST /v1/billing/customer-portal`
- `POST /v1/billing/webhook`
- `GET /v1/onboarding/me`
- `PUT /v1/onboarding/me`

`/v1/ai/*`, `/v1/persistence/*`, `/v1/editorials/*`, `/v1/billing/*`, and `/v1/onboarding/*` expect a valid Auth0 bearer token when `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are configured. `POST /v1/billing/webhook` uses Razorpay webhook signature verification instead of Auth0. Editorial reads require `read:all` or `commitly:readall`; editorial writes require `create:all` or `commitly:writeall`.

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The service can boot without an API key, but DeepSeek-backed AI routes will return `503` until `DEEPSEEK_API_KEY` is configured.

Persistent storage routes also require `DATABASE_URL`.

Judge reference embedding seeding requires Postgres with `pgvector` and Ollama. Use an Ollama embedding model that matches the 768-dimensional vector table, such as `nomic-embed-text`.

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
`005_billing_onboarding.sql` creates onboarding profiles, Razorpay customer/subscription records, and monthly usage events.
`006_razorpay_billing_rename.sql` renames the early billing columns if the previous billing migration was already applied locally.
`007_plus_pro_plan_tiers.sql` converts the paid plan enum to Plus and Pro.

Apply them with:

```bash
cd backend
psql "$DATABASE_URL" -f db/migrations/001_initial_postgres_schema.sql
psql "$DATABASE_URL" -f db/migrations/002_judge_reference_vectors.sql
psql "$DATABASE_URL" -f db/migrations/003_practice_stage_diagrams.sql
psql "$DATABASE_URL" -f db/migrations/004_stage_editorials.sql
psql "$DATABASE_URL" -f db/migrations/005_billing_onboarding.sql
psql "$DATABASE_URL" -f db/migrations/006_razorpay_billing_rename.sql
psql "$DATABASE_URL" -f db/migrations/007_plus_pro_plan_tiers.sql
```

## Billing and entitlements

Razorpay checkout is disabled until these env vars are configured:

```bash
FRONTEND_BASE_URL=http://localhost:5173
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_PLUS_MONTHLY=plan_...
RAZORPAY_PLAN_PLUS_YEARLY=plan_...
RAZORPAY_PLAN_PRO_MONTHLY=plan_...
RAZORPAY_PLAN_PRO_YEARLY=plan_...
MONTHLY_AI_FREE_QUOTA=10
MONTHLY_AI_PLUS_QUOTA=200
MONTHLY_AI_PRO_QUOTA=1000
```

`POST /v1/billing/checkout-session` creates a Razorpay subscription and returns Checkout options. The frontend opens Razorpay Checkout, then sends `razorpay_payment_id`, `razorpay_subscription_id`, and `razorpay_signature` to `POST /v1/billing/verify-subscription`. Subscription state is also synced from Razorpay webhooks.

AI hints and validations are quota-gated through `/v1/ai/*`. Free users use the free monthly quota; authenticated or active Plus and Pro subscriptions use their configured quota.

## AI provider

Configure DeepSeek for hints and LLM-backed validation:

```bash
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
AI_VALIDATION_PROVIDER=deepseek
```

To keep validation on the deterministic rubric judge while still using DeepSeek for hints, set:

```bash
AI_VALIDATION_PROVIDER=rule-engine
```

## Judge embeddings

Preferred solution chunks are generated from the full frontend problem catalog and the curated judge rubrics.

Seed or refresh their embeddings with Ollama:

```bash
cd backend
ollama pull nomic-embed-text
npm run seed:judge-embeddings
```

The seed covers every problem and all six stages, then replaces `judge_reference_chunks` so stale vectors do not survive rubric changes.

## Stage editorials

Stage editorials are stored in Postgres and served through protected `/v1/editorials/*` routes. Seed them after applying `004_stage_editorials.sql`:

```bash
cd backend
npm run seed:stage-editorials
```

The seed creates one editorial for every catalog problem and each of the six practice stages.
