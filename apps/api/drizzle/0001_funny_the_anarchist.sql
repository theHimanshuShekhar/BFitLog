CREATE TYPE "public"."checklist_kind" AS ENUM('warmup', 'cooldown');--> statement-breakpoint
CREATE TYPE "public"."exercise_media_kind" AS ENUM('gif', 'video');--> statement-breakpoint
CREATE TYPE "public"."exercise_tracking_type" AS ENUM('reps_weight', 'duration');--> statement-breakpoint
CREATE TABLE "exercise_media" (
	"id" text PRIMARY KEY NOT NULL,
	"exercise_id" text NOT NULL,
	"kind" "exercise_media_kind" NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"equipment" text,
	"tracking_type" "exercise_tracking_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "planned_exercise_substitutes" (
	"planned_exercise_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"target_sets" integer,
	"target_min_reps" integer,
	"target_max_reps" integer,
	"target_duration_seconds" integer,
	"notes" text,
	CONSTRAINT "planned_exercise_substitutes_planned_exercise_id_exercise_id_pk" PRIMARY KEY("planned_exercise_id","exercise_id")
);
--> statement-breakpoint
CREATE TABLE "planned_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"training_day_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"target_sets" integer NOT NULL,
	"target_min_reps" integer,
	"target_max_reps" integer,
	"target_duration_seconds" integer,
	"rest_seconds" integer DEFAULT 90 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "training_day_checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"training_day_id" text NOT NULL,
	"kind" "checklist_kind" NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_days" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plan_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_training_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"template_id" text,
	"name" text NOT NULL,
	"active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_media" ADD CONSTRAINT "exercise_media_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_exercise_substitutes" ADD CONSTRAINT "planned_exercise_substitutes_planned_exercise_id_planned_exercises_id_fk" FOREIGN KEY ("planned_exercise_id") REFERENCES "public"."planned_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_exercise_substitutes" ADD CONSTRAINT "planned_exercise_substitutes_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_exercises" ADD CONSTRAINT "planned_exercises_training_day_id_training_days_id_fk" FOREIGN KEY ("training_day_id") REFERENCES "public"."training_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_exercises" ADD CONSTRAINT "planned_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_day_checklist_items" ADD CONSTRAINT "training_day_checklist_items_training_day_id_training_days_id_fk" FOREIGN KEY ("training_day_id") REFERENCES "public"."training_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_days" ADD CONSTRAINT "training_days_template_id_training_plan_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."training_plan_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_training_plans" ADD CONSTRAINT "user_training_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_training_plans" ADD CONSTRAINT "user_training_plans_template_id_training_plan_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."training_plan_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_media_exercise_idx" ON "exercise_media" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "planned_exercises_day_idx" ON "planned_exercises" USING btree ("training_day_id");--> statement-breakpoint
CREATE INDEX "training_day_checklist_day_idx" ON "training_day_checklist_items" USING btree ("training_day_id");--> statement-breakpoint
CREATE INDEX "training_days_template_idx" ON "training_days" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "user_training_plans_user_idx" ON "user_training_plans" USING btree ("user_id");