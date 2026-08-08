ALTER TABLE reminders
    ADD COLUMN completed_at TIMESTAMP;

ALTER TABLE reminders
    ADD COLUMN recurrence_days INT;

-- The access path for "what is open and overdue", which both the start page and the
-- INS-01 sampler ask for.
CREATE INDEX idx_reminders_completed_remind
    ON reminders (completed_at, remind_at);
