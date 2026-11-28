CREATE TABLE classlyai.quiz_questions (
    revision_id uuid NOT NULL REFERENCES classlyai.lesson_revisions ON DELETE CASCADE,
    ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 10),
    prompt text NOT NULL CHECK (btrim(prompt) <> '' AND char_length(prompt) <= 300),
    options text[] NOT NULL CHECK (cardinality(options) BETWEEN 2 AND 6),
    correct integer NOT NULL CHECK (correct >= 0),
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'generated')),
    PRIMARY KEY (revision_id, ordinal),
    CHECK (correct < cardinality(options))
);

-- Student results refer to these answer keys, so a published revision's questions never change.
CREATE FUNCTION classlyai.protect_published_quiz() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM classlyai.lesson_revisions
        WHERE id = OLD.revision_id AND published_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Quiz questions of a published revision cannot change.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END
$$;

CREATE TRIGGER quiz_questions_protect_published
    BEFORE UPDATE OR DELETE ON classlyai.quiz_questions
    FOR EACH ROW EXECUTE FUNCTION classlyai.protect_published_quiz();
