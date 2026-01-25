CREATE TABLE "class_curriculum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"schwerpunktebene_id" uuid NOT NULL,
	"month_number" integer NOT NULL,
	"custom_title_de" varchar(255),
	"custom_title_en" varchar(255),
	"custom_description_de" text,
	"custom_description_en" text,
	"mentor_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_curriculum_class_month_unique" UNIQUE("class_id","month_number")
);
--> statement-breakpoint
CREATE TABLE "class_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"paid" boolean DEFAULT false NOT NULL,
	"amount" numeric(10, 2),
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_members_class_user_unique" UNIQUE("class_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "class_curriculum" ADD CONSTRAINT "class_curriculum_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_curriculum" ADD CONSTRAINT "class_curriculum_schwerpunktebene_id_schwerpunktebenen_id_fk" FOREIGN KEY ("schwerpunktebene_id") REFERENCES "public"."schwerpunktebenen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_curriculum_class_idx" ON "class_curriculum" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_curriculum_schwerpunktebene_idx" ON "class_curriculum" USING btree ("schwerpunktebene_id");--> statement-breakpoint
CREATE INDEX "class_curriculum_month_idx" ON "class_curriculum" USING btree ("month_number");--> statement-breakpoint
CREATE INDEX "class_members_class_idx" ON "class_members" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_members_user_idx" ON "class_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "class_members_paid_idx" ON "class_members" USING btree ("paid");