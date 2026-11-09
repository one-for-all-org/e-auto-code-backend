-- Migration : ajouter resource_url (lien optionnel) et updated_at à road_lessons
ALTER TABLE "road_lessons" ADD COLUMN IF NOT EXISTS "resource_url" TEXT;
--> statement-breakpoint
ALTER TABLE "road_lessons" ADD COLUMN IF NOT EXISTS "updated_at" BIGINT;
