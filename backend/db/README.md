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

To apply the schema with `psql`:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_postgres_schema.sql
psql "$DATABASE_URL" -f db/migrations/002_judge_reference_vectors.sql
psql "$DATABASE_URL" -f db/migrations/003_practice_stage_diagrams.sql
psql "$DATABASE_URL" -f db/migrations/004_stage_editorials.sql
```

The backend now upserts `app_users`, `user_problem_progress`, and `practice_sessions` from authenticated API calls under `/v1/persistence/*`.

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
- `EMBEDDING_PROVIDER`, either `gemini` or `ollama`
- `EMBEDDING_DIMENSIONS`, defaulting to `768`
- for Gemini: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GEMINI_EMBEDDING_MODEL`, defaulting to `gemini-embedding-001`
- for Ollama: `OLLAMA_BASE_URL`, defaulting to `http://localhost:11434`
- for Ollama: `OLLAMA_EMBEDDING_MODEL`, defaulting to `nomic-embed-text`

The migration defines `embedding VECTOR(768)`, so keep `EMBEDDING_DIMENSIONS=768` unless you also update the migration/table type. `nomic-embed-text` is the safest Ollama default for the current 768-dimensional table.

To seed with Ollama:

```bash
ollama pull nomic-embed-text
EMBEDDING_PROVIDER=ollama npm run seed:judge-embeddings
```
