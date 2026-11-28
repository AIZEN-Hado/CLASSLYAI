CREATE TABLE classlyai.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES classlyai.courses ON DELETE CASCADE,
    title text NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 160),
    prompt text NOT NULL CHECK (btrim(prompt) <> '' AND char_length(prompt) <= 2000),
    created_by uuid NOT NULL REFERENCES classlyai.users,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assignments_course_idx ON classlyai.assignments (course_id, created_at DESC);

CREATE TABLE classlyai.assignment_points (
    assignment_id uuid NOT NULL REFERENCES classlyai.assignments ON DELETE CASCADE,
    ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 6),
    description text NOT NULL CHECK (btrim(description) <> '' AND char_length(description) <= 300),
    PRIMARY KEY (assignment_id, ordinal)
);

-- One current submission per student. Resubmitting replaces the answer, its marks and its review.
CREATE TABLE classlyai.submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES classlyai.assignments ON DELETE CASCADE,
    course_id uuid NOT NULL,
    student_id uuid NOT NULL,
    answer text NOT NULL CHECK (btrim(answer) <> '' AND char_length(answer) <= 2000),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    reviewed_by uuid REFERENCES classlyai.users,
    reviewed_at timestamptz,
    UNIQUE (assignment_id, student_id),
    CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)),
    FOREIGN KEY (course_id, student_id) REFERENCES classlyai.course_memberships ON DELETE CASCADE
);

-- auto_awarded is the model's advisory decision; final_awarded is set only when an instructor reviews.
CREATE TABLE classlyai.submission_marks (
    submission_id uuid NOT NULL REFERENCES classlyai.submissions ON DELETE CASCADE,
    ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 6),
    auto_awarded boolean NOT NULL,
    encoder_score real NOT NULL CHECK (encoder_score BETWEEN 0 AND 1),
    flagged boolean NOT NULL,
    final_awarded boolean,
    PRIMARY KEY (submission_id, ordinal)
);
