ALTER TABLE classlyai.lessons ADD CONSTRAINT lessons_course_id_id_key UNIQUE (course_id, id);

CREATE TABLE classlyai.lesson_progress (
    course_id uuid NOT NULL,
    student_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    last_viewed_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    PRIMARY KEY (course_id, student_id, lesson_id),
    FOREIGN KEY (course_id, student_id) REFERENCES classlyai.course_memberships (course_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id, lesson_id) REFERENCES classlyai.lessons (course_id, id) ON DELETE CASCADE
);

CREATE INDEX lesson_progress_resume_idx
    ON classlyai.lesson_progress (course_id, student_id, last_viewed_at DESC)
    WHERE completed_at IS NULL;
