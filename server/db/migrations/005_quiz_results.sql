CREATE TABLE classlyai.quiz_results (
    course_id uuid NOT NULL,
    student_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    revision_id uuid NOT NULL,
    score integer NOT NULL CHECK (score >= 0),
    PRIMARY KEY (student_id, revision_id),
    FOREIGN KEY (course_id, student_id) REFERENCES classlyai.course_memberships ON DELETE CASCADE,
    FOREIGN KEY (course_id, lesson_id) REFERENCES classlyai.lessons (course_id, id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id, revision_id) REFERENCES classlyai.lesson_revisions (lesson_id, id) ON DELETE CASCADE
);
