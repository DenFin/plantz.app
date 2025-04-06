ALTER TABLE photos
    ADD COLUMN note_id uuid;

ALTER TABLE photos
    ADD CONSTRAINT fk_photos_note
        FOREIGN KEY (note_id)
            REFERENCES notes (id)
            ON DELETE SET NULL