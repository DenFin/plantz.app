CREATE TABLE users
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMP        DEFAULT now()
);

CREATE TABLE plants
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users (id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    species    TEXT,
    location   TEXT,
    created_at TIMESTAMP        DEFAULT now()
);

CREATE TABLE photos
(
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id  UUID REFERENCES plants (id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    taken_at  TIMESTAMP        DEFAULT now()
);

CREATE TABLE notes
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id   UUID REFERENCES plants (id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMP        DEFAULT now()
);

CREATE TABLE reminders
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id   UUID REFERENCES plants (id) ON DELETE CASCADE,
    remind_at  TIMESTAMP NOT NULL,
    message    TEXT,
    created_at TIMESTAMP        DEFAULT now()
);
