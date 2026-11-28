-- A course's join code lets a student enrol themselves. Rotating the code stops new joins without removing members.
ALTER TABLE classlyai.courses
    ADD COLUMN join_code text UNIQUE CHECK (join_code ~ '^[A-HJ-NP-Z2-9]{8}$');
