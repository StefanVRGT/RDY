CREATE TYPE "public"."class_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "class_status" DEFAULT 'active' NOT NULL,
	"duration_months" integer DEFAULT 3 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"session_config" jsonb DEFAULT '{"monthlySessionCount":2,"sessionDurationMinutes":60}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_tenant_idx" ON "classes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "classes_mentor_idx" ON "classes" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "classes_status_idx" ON "classes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "classes_dates_idx" ON "classes" USING btree ("start_date","end_date");