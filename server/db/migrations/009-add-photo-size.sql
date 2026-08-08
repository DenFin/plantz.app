-- The board plots stored bytes alongside photo count. Nullable because existing rows are
-- backfilled by a one-off script (scripts/backfillPhotoSizes.ts) rather than at startup.
ALTER TABLE photos
    ADD COLUMN size_bytes BIGINT;
