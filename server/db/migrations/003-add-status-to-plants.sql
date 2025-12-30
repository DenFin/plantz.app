-- 1. Create the enum type
CREATE TYPE plant_status AS ENUM ('healthy', 'sick', 'dead', 'needs_repotting');

-- 2. Add the column using the enum type
ALTER TABLE plants
ADD COLUMN status plant_status DEFAULT 'healthy';

-- 3. (Optional) update existing rows
UPDATE plants SET status = 'healthy' WHERE status IS NULL;

-- 4. (Optional) enforce NOT NULL
ALTER TABLE plants
ALTER COLUMN status SET NOT NULL;
