CREATE TYPE "public"."rsvp_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "group_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"class_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"agenda" text,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"max_participants" integer,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_session_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "rsvp_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_session_rsvps_session_user_unique" UNIQUE("group_session_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_session_rsvps" ADD CONSTRAINT "group_session_rsvps_group_session_id_group_sessions_id_fk" FOREIGN KEY ("group_session_id") REFERENCES "public"."group_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_session_rsvps" ADD CONSTRAINT "group_session_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_sessions_tenant_idx" ON "group_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "group_sessions_mentor_idx" ON "group_sessions" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "group_sessions_class_idx" ON "group_sessions" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "group_sessions_status_idx" ON "group_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_sessions_scheduled_idx" ON "group_sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "group_session_rsvps_session_idx" ON "group_session_rsvps" USING btree ("group_session_id");--> statement-breakpoint
CREATE INDEX "group_session_rsvps_user_idx" ON "group_session_rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_session_rsvps_status_idx" ON "group_session_rsvps" USING btree ("status");
