ALTER TABLE plants
    ADD COLUMN parent_plant_id UUID;

ALTER TABLE plants
    ADD CONSTRAINT fk_parent_plant
        FOREIGN KEY (parent_plant_id)
            REFERENCES plants (id)
            ON DELETE SET NULL;