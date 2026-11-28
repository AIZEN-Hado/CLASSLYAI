CREATE TABLE classlyai.lesson_notes (
    revision_id uuid NOT NULL REFERENCES classlyai.lesson_revisions ON DELETE CASCADE,
    ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 12),
    heading text NOT NULL CHECK (btrim(heading) <> '' AND char_length(heading) <= 120),
    body text NOT NULL CHECK (btrim(body) <> '' AND char_length(body) <= 600),
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'generated')),
    PRIMARY KEY (revision_id, ordinal)
);

-- Students read these notes, so a published revision's notes never change.
CREATE FUNCTION classlyai.protect_published_notes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM classlyai.lesson_revisions
        WHERE id = OLD.revision_id AND published_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Study notes of a published revision cannot change.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END
$$;

CREATE TRIGGER lesson_notes_protect_published
    BEFORE UPDATE OR DELETE ON classlyai.lesson_notes
    FOR EACH ROW EXECUTE FUNCTION classlyai.protect_published_notes();
