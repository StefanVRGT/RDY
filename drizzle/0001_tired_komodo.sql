CREATE TYPE "public"."exercise_frequency" AS ENUM('daily', 'weekly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."exercise_type" AS ENUM('video', 'audio', 'text');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "exercise_type" DEFAULT 'text' NOT NULL,
	"title_de" varchar(255) NOT NULL,
	"title_en" varchar(255),
	"description_de" text,
	"description_en" text,
	"duration_minutes" integer,
	"video_url" text,
	"audio_url" text,
	"content_de" text,
	"content_en" text,
	"order_index" varchar(10) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_obligatory" boolean DEFAULT true NOT NULL,
	"frequency" "exercise_frequency" DEFAULT 'daily' NOT NULL,
	"custom_frequency" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_exercises" ADD CONSTRAINT "week_exercises_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_exercises" ADD CONSTRAINT "week_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_tenant_idx" ON "exercises" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "exercises_type_idx" ON "exercises" USING btree ("type");--> statement-breakpoint
CREATE INDEX "exercises_order_idx" ON "exercises" USING btree ("tenant_id","order_index");--> statement-breakpoint
CREATE INDEX "week_exercises_week_idx" ON "week_exercises" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "week_exercises_exercise_idx" ON "week_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "week_exercises_order_idx" ON "week_exercises" USING btree ("week_id","order_index");