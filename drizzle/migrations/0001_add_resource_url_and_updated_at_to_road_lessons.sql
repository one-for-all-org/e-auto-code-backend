-- Migration : ajouter resource_url et updated_at à road_lessons
ALTER TABLE road_lessons ADD COLUMN resource_url TEXT;
ALTER TABLE road_lessons ADD COLUMN updated_at BIGINT;
