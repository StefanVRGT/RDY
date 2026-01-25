CREATE TABLE "scheduled_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_recurring_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"default_time" varchar(5) NOT NULL,
	"applicable_days" jsonb NOT NULL,
	"active_from" timestamp NOT NULL,
	"active_through" timestamp,
	"duration_minutes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_exercises" ADD CONSTRAINT "scheduled_exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_exercises" ADD CONSTRAINT "scheduled_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_exercises" ADD CONSTRAINT "scheduled_exercises_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_recurring_exercises" ADD CONSTRAINT "weekly_recurring_exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_recurring_exercises" ADD CONSTRAINT "weekly_recurring_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_exercises_user_idx" ON "scheduled_exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_exercises_exercise_idx" ON "scheduled_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "scheduled_exercises_class_idx" ON "scheduled_exercises" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "scheduled_exercises_scheduled_idx" ON "scheduled_exercises" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "scheduled_exercises_completed_idx" ON "scheduled_exercises" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "weekly_recurring_exercises_user_idx" ON "weekly_recurring_exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "weekly_recurring_exercises_exercise_idx" ON "weekly_recurring_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "weekly_recurring_exercises_active_idx" ON "weekly_recurring_exercises" USING btree ("active_from","active_through");