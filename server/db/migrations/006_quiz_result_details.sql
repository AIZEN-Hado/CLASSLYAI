ALTER TABLE classlyai.quiz_results
    ADD COLUMN answers integer[],
    ADD COLUMN submitted_at timestamptz,
    ADD CONSTRAINT quiz_result_details_together CHECK ((answers IS NULL) = (submitted_at IS NULL));
