CREATE TABLE plant_status_events
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id    UUID         NOT NULL REFERENCES plants (id) ON DELETE CASCADE,
    -- Nullable so a row can express "created as healthy" if that is ever recorded.
    -- Day one, only real transitions produce rows.
    from_status plant_status,
    to_status   plant_status NOT NULL,
    changed_at  TIMESTAMP    NOT NULL DEFAULT now(),
    note        TEXT
);

CREATE INDEX idx_plant_status_events_plant_changed
    ON plant_status_events (plant_id, changed_at DESC);
