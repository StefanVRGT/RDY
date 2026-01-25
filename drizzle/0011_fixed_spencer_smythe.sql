CREATE TYPE "public"."pattern_intensity" AS ENUM('strong', 'weak', 'none');--> statement-breakpoint
CREATE TYPE "public"."pattern_type" AS ENUM('stress', 'energy', 'mood', 'focus', 'anxiety', 'motivation');--> statement-breakpoint
CREATE TABLE "pattern_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_date" timestamp NOT NULL,
	"hour" integer NOT NULL,
	"pattern_type" "pattern_type" NOT NULL,
	"intensity" "pattern_intensity" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pattern_entries_user_date_hour_type_unique" UNIQUE("user_id","entry_date","hour","pattern_type")
);
--> statement-breakpoint
ALTER TABLE "pattern_entries" ADD CONSTRAINT "pattern_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pattern_entries_user_idx" ON "pattern_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pattern_entries_date_idx" ON "pattern_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "pattern_entries_user_date_idx" ON "pattern_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "pattern_entries_type_idx" ON "pattern_entries" USING btree ("pattern_type");