-- Migration 006: Foreign-Key-Constraint von plants.user_id auf users(id) entfernen.
-- Die Spalte user_id bleibt bestehen (UUID, nullable). FK wird in Migration 008 auf "user"(id) gesetzt.

ALTER TABLE plants
    DROP CONSTRAINT plants_user_id_fkey;
