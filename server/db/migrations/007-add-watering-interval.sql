-- Nullable on purpose: a plant without an interval is never overdue and never appears in
-- the due list. That way the feature works with zero plants configured and improves as
-- intervals get filled in, instead of producing a meaningless list of every plant on day
-- one.
ALTER TABLE plants
    ADD COLUMN watering_interval_days INT;
