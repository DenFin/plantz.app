CREATE TYPE care_type AS ENUM ('watering', 'fertilizing', 'repotting', 'pruning', 'treatment');

CREATE TABLE care_events
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id    UUID      NOT NULL REFERENCES plants (id) ON DELETE CASCADE,
    type        care_type NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now(),
    note        TEXT,
    created_at  TIMESTAMP          DEFAULT now()
);

-- The access path for both the plant detail page and the INS-01 sampler: the newest
-- event of one type for one plant.
CREATE INDEX idx_care_events_plant_type_occurred
    ON care_events (plant_id, type, occurred_at DESC);
