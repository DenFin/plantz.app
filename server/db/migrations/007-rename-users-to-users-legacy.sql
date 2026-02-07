-- Migration 007: Tabelle users in users_legacy umbenennen.
-- Keine Daten werden gelöscht; die Tabelle kann später ausgewertet oder gedroppt werden.

ALTER TABLE users
    RENAME TO users_legacy;
