ALTER TABLE "road_lessons" DROP CONSTRAINT "road_lessons_uploaded_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "road_lessons" ALTER COLUMN "uploaded_by" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "road_lessons" ADD CONSTRAINT "road_lessons_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
