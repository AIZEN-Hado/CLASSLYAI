CREATE TABLE classlyai.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE CHECK (email <> '' AND email = lower(btrim(email))),
    display_name text NOT NULL CHECK (btrim(display_name) <> ''),
    password_hash text NOT NULL CHECK (password_hash <> ''),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classlyai.sessions (
    token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    user_id uuid NOT NULL REFERENCES classlyai.users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
    revoked_at timestamptz CHECK (revoked_at >= created_at)
);

CREATE INDEX sessions_user_id_idx ON classlyai.sessions (user_id);

CREATE TABLE classlyai.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title text NOT NULL CHECK (btrim(title) <> ''),
    summary text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classlyai.course_memberships (
    course_id uuid NOT NULL REFERENCES classlyai.courses (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES classlyai.users (id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('instructor', 'student')),
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz CHECK (revoked_at >= created_at),
    PRIMARY KEY (course_id, user_id)
);

CREATE INDEX course_memberships_user_id_idx ON classlyai.course_memberships (user_id);

CREATE TABLE classlyai.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES classlyai.courses (id) ON DELETE CASCADE,
    slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    position integer NOT NULL CHECK (position > 0),
    active_revision_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, slug),
    UNIQUE (course_id, position)
);

CREATE TABLE classlyai.lesson_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL REFERENCES classlyai.lessons (id) ON DELETE CASCADE,
    revision_number integer NOT NULL CHECK (revision_number > 0),
    authored_by uuid NOT NULL REFERENCES classlyai.users (id),
    title text NOT NULL CHECK (btrim(title) <> ''),
    markdown text NOT NULL CHECK (markdown ~ '[^[:space:]]'),
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz CHECK (published_at >= created_at),
    withdrawn_at timestamptz CHECK (withdrawn_at IS NULL OR (published_at IS NOT NULL AND withdrawn_at >= published_at)),
    UNIQUE (lesson_id, revision_number),
    UNIQUE (lesson_id, id)
);

ALTER TABLE classlyai.lessons ADD CONSTRAINT lessons_active_revision_fkey
    FOREIGN KEY (id, active_revision_id) REFERENCES classlyai.lesson_revisions (lesson_id, id);

CREATE FUNCTION classlyai.reject_revision_rewrite() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Create a new revision to change lesson content' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER lesson_revision_content_is_immutable
    BEFORE UPDATE ON classlyai.lesson_revisions
    FOR EACH ROW
    WHEN ((OLD.id, OLD.lesson_id, OLD.revision_number, OLD.authored_by, OLD.title, OLD.markdown, OLD.created_at)
        IS DISTINCT FROM
        (NEW.id, NEW.lesson_id, NEW.revision_number, NEW.authored_by, NEW.title, NEW.markdown, NEW.created_at))
    EXECUTE FUNCTION classlyai.reject_revision_rewrite();
