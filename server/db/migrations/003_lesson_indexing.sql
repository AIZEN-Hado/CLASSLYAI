DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
        CREATE EXTENSION IF NOT EXISTS vector;
    END IF;
END;
$$;

ALTER TABLE classlyai.lessons ADD COLUMN requested_revision_id uuid;

ALTER TABLE classlyai.lessons ADD CONSTRAINT lessons_requested_revision_fkey
    FOREIGN KEY (id, requested_revision_id) REFERENCES classlyai.lesson_revisions (lesson_id, id);

CREATE TABLE classlyai.ingestion_jobs (
    revision_id uuid PRIMARY KEY REFERENCES classlyai.lesson_revisions (id) ON DELETE CASCADE,
    state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'processing', 'ready', 'failed')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    run_after timestamptz NOT NULL DEFAULT now(),
    lease_until timestamptz,
    lease_token uuid,
    fingerprint text,
    last_error text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (state = 'processing' AND lease_until IS NOT NULL AND lease_token IS NOT NULL)
        OR (state <> 'processing' AND lease_until IS NULL AND lease_token IS NULL)
    )
);

CREATE INDEX ingestion_jobs_queue_idx ON classlyai.ingestion_jobs (run_after, revision_id) WHERE state = 'queued';
CREATE INDEX ingestion_jobs_lease_idx ON classlyai.ingestion_jobs (lease_until) WHERE state = 'processing';

CREATE TABLE classlyai.lesson_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id uuid NOT NULL REFERENCES classlyai.lesson_revisions (id) ON DELETE CASCADE,
    ordinal integer NOT NULL CHECK (ordinal >= 0),
    section text NOT NULL,
    body text NOT NULL CHECK (body ~ '[^[:space:]]'),
    start_offset integer NOT NULL CHECK (start_offset >= 0),
    end_offset integer NOT NULL CHECK (end_offset > start_offset),
    embedding real[] NOT NULL CHECK (cardinality(embedding) > 0),
    fingerprint text NOT NULL,
    search tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english'::regconfig, section), 'A') ||
        setweight(to_tsvector('english'::regconfig, body), 'B')
    ) STORED,
    UNIQUE (revision_id, fingerprint, ordinal)
);

CREATE INDEX lesson_chunks_search_idx ON classlyai.lesson_chunks USING gin (search);

UPDATE classlyai.lessons AS lesson
SET requested_revision_id = lesson.active_revision_id
FROM classlyai.lesson_revisions AS revision
WHERE revision.id = lesson.active_revision_id
    AND revision.published_at IS NOT NULL
    AND revision.withdrawn_at IS NULL;

INSERT INTO classlyai.ingestion_jobs (revision_id)
SELECT requested_revision_id
FROM classlyai.lessons
WHERE requested_revision_id IS NOT NULL;
