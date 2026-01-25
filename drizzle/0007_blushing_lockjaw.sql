CREATE TYPE "public"."diary_entry_type" AS ENUM('text', 'voice', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."notification_tone" AS ENUM('default', 'gentle', 'chime', 'alert', 'silent');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('exercise', 'session', 'group_session');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "diary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_type" "diary_entry_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"voice_recording_url" text,
	"voice_recording_duration" integer,
	"entry_date" timestamp NOT NULL,
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
CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"exercise_reminders_enabled" boolean DEFAULT true NOT NULL,
	"session_reminders_enabled" boolean DEFAULT true NOT NULL,
	"group_session_reminders_enabled" boolean DEFAULT true NOT NULL,
	"daily_summary_enabled" boolean DEFAULT false NOT NULL,
	"exercise_reminder_minutes" integer DEFAULT 15 NOT NULL,
	"session_reminder_minutes" integer DEFAULT 30 NOT NULL,
	"group_session_reminder_minutes" integer DEFAULT 60 NOT NULL,
	"notification_tone" "notification_tone" DEFAULT 'default' NOT NULL,
	"push_opted_in" boolean DEFAULT false NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"expiration_time" timestamp,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sent_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_type" "reminder_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"tone_played" "notification_tone",
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sent_reminders_user_type_reference_unique" UNIQUE("user_id","reminder_type","reference_id")
);
--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_session_rsvps" ADD CONSTRAINT "group_session_rsvps_group_session_id_group_sessions_id_fk" FOREIGN KEY ("group_session_id") REFERENCES "public"."group_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_session_rsvps" ADD CONSTRAINT "group_session_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_reminders" ADD CONSTRAINT "sent_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diary_entries_user_idx" ON "diary_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "diary_entries_date_idx" ON "diary_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "diary_entries_user_date_idx" ON "diary_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "group_session_rsvps_session_idx" ON "group_session_rsvps" USING btree ("group_session_id");--> statement-breakpoint
CREATE INDEX "group_session_rsvps_user_idx" ON "group_session_rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_session_rsvps_status_idx" ON "group_session_rsvps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_sessions_tenant_idx" ON "group_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "group_sessions_mentor_idx" ON "group_sessions" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "group_sessions_class_idx" ON "group_sessions" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "group_sessions_status_idx" ON "group_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_sessions_scheduled_idx" ON "group_sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "notification_settings_user_idx" ON "notification_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "sent_reminders_user_idx" ON "sent_reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sent_reminders_reference_idx" ON "sent_reminders" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "sent_reminders_type_idx" ON "sent_reminders" USING btree ("reminder_type");