BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE judge_reference_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id TEXT NOT NULL,
  stage_id practice_stage_id NOT NULL,
  criterion_id TEXT NOT NULL,
  chunk_type TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_dimensions INTEGER NOT NULL,
  embedding VECTOR(768) NOT NULL,
  rubric_version TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT judge_reference_chunks_problem_id_not_blank CHECK (btrim(problem_id) <> ''),
  CONSTRAINT judge_reference_chunks_criterion_id_not_blank CHECK (btrim(criterion_id) <> ''),
  CONSTRAINT judge_reference_chunks_content_not_blank CHECK (btrim(content) <> ''),
  CONSTRAINT judge_reference_chunks_content_hash_not_blank CHECK (btrim(content_hash) <> ''),
  CONSTRAINT judge_reference_chunks_rubric_version_not_blank CHECK (btrim(rubric_version) <> ''),
  CONSTRAINT judge_reference_chunks_type_check CHECK (
    chunk_type IN ('preferred_solution', 'rubric_check', 'anti_pattern')
  ),
  CONSTRAINT judge_reference_chunks_identity_unique UNIQUE (
    problem_id,
    stage_id,
    rubric_version,
    criterion_id,
    chunk_type,
    content_hash
  )
);

CREATE INDEX idx_judge_reference_chunks_lookup
  ON judge_reference_chunks (problem_id, stage_id, rubric_version, criterion_id);

CREATE INDEX idx_judge_reference_chunks_embedding_hnsw
  ON judge_reference_chunks
  USING hnsw (embedding vector_cosine_ops);

COMMIT;
