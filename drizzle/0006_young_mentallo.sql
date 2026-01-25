CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'available', 'booked', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('1:1', 'group');--> statement-breakpoint
CREATE TABLE "mentoring_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"mentee_id" uuid,
	"class_id" uuid,
	"session_type" "session_type" DEFAULT '1:1' NOT NULL,
	"status" "session_status" DEFAULT 'available' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"notes" text,
	"has_voice_recording" boolean DEFAULT false NOT NULL,
	"voice_recording_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentoring_sessions" ADD CONSTRAINT "mentoring_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentoring_sessions" ADD CONSTRAINT "mentoring_sessions_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentoring_sessions" ADD CONSTRAINT "mentoring_sessions_mentee_id_users_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentoring_sessions" ADD CONSTRAINT "mentoring_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mentoring_sessions_tenant_idx" ON "mentoring_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mentoring_sessions_mentor_idx" ON "mentoring_sessions" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "mentoring_sessions_mentee_idx" ON "mentoring_sessions" USING btree ("mentee_id");--> statement-breakpoint
CREATE INDEX "mentoring_sessions_class_idx" ON "mentoring_sessions" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "mentoring_sessions_status_idx" ON "mentoring_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mentoring_sessions_scheduled_idx" ON "mentoring_sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "mentoring_sessions_type_idx" ON "mentoring_sessions" USING btree ("session_type");