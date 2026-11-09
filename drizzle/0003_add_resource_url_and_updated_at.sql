-- Migration : ajouter resource_url (lien optionnel) et updated_at à road_lessons
ALTER TABLE "road_lessons" ADD COLUMN "resource_url" TEXT;
--> statement-breakpoint
ALTER TABLE "road_lessons" ADD COLUMN "updated_at" BIGINT;
