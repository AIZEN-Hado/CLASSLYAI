CREATE TABLE classlyai.tutor_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL,
    student_id uuid NOT NULL,
    title text NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 120),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (course_id, student_id) REFERENCES classlyai.course_memberships ON DELETE CASCADE
);

CREATE INDEX tutor_conversations_owner_idx ON classlyai.tutor_conversations (student_id, course_id, updated_at DESC);

CREATE TABLE classlyai.tutor_messages (
    conversation_id uuid NOT NULL REFERENCES classlyai.tutor_conversations ON DELETE CASCADE,
    ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 50),
    question text NOT NULL CHECK (btrim(question) <> '' AND char_length(question) <= 1000),
    answer jsonb NOT NULL CHECK (jsonb_typeof(answer) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, ordinal)
);
