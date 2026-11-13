CREATE TABLE IF NOT EXISTS "road_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"extracted_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "road_lessons" ADD COLUMN "resource_url" text;--> statement-breakpoint
ALTER TABLE "road_lessons" ADD COLUMN "updated_at" bigint NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "road_sources" ADD CONSTRAINT "road_sources_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "road_sources_url_unique" ON "road_sources" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_road_sources_active" ON "road_sources" USING btree ("is_active");