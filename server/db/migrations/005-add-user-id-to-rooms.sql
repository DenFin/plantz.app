-- Migration 005: Spalte user_id (UUID, nullable) zur Tabelle rooms hinzufügen.
-- Kein Foreign Key (wird in späterer Migration 008 gesetzt, nach Anlegen der Tabelle "user").

ALTER TABLE rooms
    ADD COLUMN user_id UUID NULL;
