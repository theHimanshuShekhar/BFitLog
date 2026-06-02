CREATE TABLE "notification_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"platform" text NOT NULL,
	"push_token" text,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"workout_reminder_enabled" boolean DEFAULT false NOT NULL,
	"workout_reminder_time" text,
	"weigh_in_reminder_enabled" boolean DEFAULT false NOT NULL,
	"weigh_in_reminder_time" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_devices" ADD CONSTRAINT "notification_devices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_devices_user_idx" ON "notification_devices" USING btree ("user_id");