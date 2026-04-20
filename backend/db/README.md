# Database

Initial Postgres schema lives in `db/migrations/001_initial_postgres_schema.sql`.

It covers the first persistence slice for the current app:

- `app_users` stores the authenticated identity from Auth0
- `user_problem_progress` stores bookmarked and practiced flags per user/problem
- `practice_sessions` stores the per-user session envelope for a problem
- `practice_stage_drafts` stores notes and completion state for each stage

To apply the initial schema with `psql`:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_postgres_schema.sql
```

The next backend step is wiring request handlers to upsert `app_users`, `user_problem_progress`, and `practice_sessions` from authenticated API calls.
