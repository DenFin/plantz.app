CREATE TABLE rooms
(
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    color       VARCHAR(50)  NOT NULL,
    icon        VARCHAR(100) NOT NULL,
    orientation VARCHAR(50)  NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Neue Spalte "room_id" zu "plants" hinzufügen (mit NULL erlaubt, um Konflikte zu vermeiden)
ALTER TABLE plants
    ADD COLUMN room_id INT;

-- 2. "room_id" als Fremdschlüssel definieren (setzt auf NULL, wenn der Raum gelöscht wird)
ALTER TABLE plants
    ADD CONSTRAINT fk_plants_room
        FOREIGN KEY (room_id)
            REFERENCES rooms (id)
            ON DELETE SET NULL;