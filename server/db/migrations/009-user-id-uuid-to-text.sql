-- Migration 009: plants.user_id und rooms.user_id von UUID auf TEXT umstellen (für Better Auth "user".id).

ALTER TABLE plants
    ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE rooms
    ALTER COLUMN user_id TYPE text USING user_id::text;
