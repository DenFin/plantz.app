-- Migration 010: Foreign Keys von plants.user_id und rooms.user_id auf "user"(id).

ALTER TABLE plants
    ADD CONSTRAINT plants_user_id_fkey
        FOREIGN KEY (user_id)
            REFERENCES "user" (id)
            ON DELETE CASCADE;

ALTER TABLE rooms
    ADD CONSTRAINT rooms_user_id_fkey
        FOREIGN KEY (user_id)
            REFERENCES "user" (id)
            ON DELETE CASCADE;
