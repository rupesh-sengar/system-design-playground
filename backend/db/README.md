# Database

Postgres migrations live in `db/migrations`.

`001_initial_postgres_schema.sql` covers the first persistence slice for the current app:

- `app_users` stores the authenticated identity from Auth0
- `user_problem_progress` stores bookmarked and practiced flags per user/problem
- `practice_sessions` stores the per-user session envelope for a problem
- `practice_stage_drafts` stores notes and completion state for each stage

`002_judge_reference_vectors.sql` adds the vector store used by judge coverage:

- enables `pgvector`
- creates `judge_reference_chunks`
- stores preferred-solution chunks, rubric checks, and anti-pattern vectors
- indexes embeddings with cosine HNSW search

`003_practice_stage_diagrams.sql` adds drawpad persistence:

- adds `diagram_json` to `practice_stage_drafts`
- stores the High-level Design drawpad nodes and connectors with the stage draft

`004_stage_editorials.sql` adds protected editorial storage:

- stores one editorial per `problem_id` and `stage_id`
- tracks creating and updating users from Auth0-backed app users
- keeps editorial HTML out of the frontend bundle

`013_stage_editorial_diagrams.sql` adds reference solution diagrams:

- adds `diagram_json` to `stage_editorials`
- stores read-only high-level design architecture diagrams with protected solutions

`005_billing_onboarding.sql` adds the first SaaS billing slice:

- stores onboarding profile answers per user
- stores one explicit billing account row per user, defaulting to Free
- maps app users to Razorpay customer IDs
- stores paid subscription state synced from Razorpay webhooks
- tracks monthly AI hint and validation usage events

`006_razorpay_billing_rename.sql` keeps local databases compatible if the billing slice was applied before the Razorpay switch.

`007_plus_pro_plan_tiers.sql` converts the paid plan enum to Plus and Pro.

`009_app_user_profile_metadata.sql` adds searchable user profile metadata:

- stores username and picture URL alongside email/display name
- tracks `last_seen_at`
- indexes email and username for admin lookup

`010_user_billing_account_summary.sql` adds an admin lookup view:

- shows each app user with effective plan tier
- shows monthly AI quota used and remaining
- includes subscription and profile identifiers for easier support lookup

`011_user_billing_accounts.sql` backfills and enforces explicit billing accounts:

- creates `user_billing_accounts` for existing databases
- inserts a Free billing account row for every existing user without one
- keeps active paid subscriptions reflected as subscription-sourced accounts
- refreshes `user_billing_account_summary` to read from the explicit account table

To apply the schema with `psql`:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_postgres_schema.sql
psql "$DATABASE_URL" -f db/migrations/002_judge_reference_vectors.sql
psql "$DATABASE_URL" -f db/migrations/003_practice_stage_diagrams.sql
psql "$DATABASE_URL" -f db/migrations/004_stage_editorials.sql
psql "$DATABASE_URL" -f db/migrations/005_billing_onboarding.sql
psql "$DATABASE_URL" -f db/migrations/006_razorpay_billing_rename.sql
psql "$DATABASE_URL" -f db/migrations/007_plus_pro_plan_tiers.sql
psql "$DATABASE_URL" -f db/migrations/009_app_user_profile_metadata.sql
psql "$DATABASE_URL" -f db/migrations/010_user_billing_account_summary.sql
psql "$DATABASE_URL" -f db/migrations/011_user_billing_accounts.sql
psql "$DATABASE_URL" -f db/migrations/013_stage_editorial_diagrams.sql
```

The backend now upserts `app_users`, `user_problem_progress`, and `practice_sessions` from authenticated API calls under `/v1/persistence/*`. Billing and onboarding tables are written by `/v1/billing/*`, `/v1/onboarding/*`, and Razorpay webhooks.

To seed protected stage editorials for every catalog problem:

```bash
cd backend
npm run seed:stage-editorials
```

## Judge Reference Embeddings

Preferred solution text is generated from the full frontend problem catalog and the curated judge rubrics in `src/modules/judge/references/preferred-solution.chunks.ts`.

To feed those preferred solutions into Postgres:

```bash
cd backend
npm run seed:judge-embeddings
```

The seed covers every catalog problem and every practice stage:

- `requirements`
- `core-entities`
- `api-interface`
- `data-flow`
- `high-level-design`
- `deep-dives`

The seed replaces `judge_reference_chunks` on each run so stale vectors are removed when rubrics change.

The seed script requires:

- `DATABASE_URL`
- `EMBEDDING_PROVIDER=ollama`
- `EMBEDDING_DIMENSIONS`, defaulting to `768`
- `OLLAMA_BASE_URL`, defaulting to `http://localhost:11434`
- `OLLAMA_EMBEDDING_MODEL`, defaulting to `nomic-embed-text`

The migration defines `embedding VECTOR(768)`, so keep `EMBEDDING_DIMENSIONS=768` unless you also update the migration/table type. `nomic-embed-text` is the safest Ollama default for the current 768-dimensional table.

To seed:

```bash
ollama pull nomic-embed-text
npm run seed:judge-embeddings
```
