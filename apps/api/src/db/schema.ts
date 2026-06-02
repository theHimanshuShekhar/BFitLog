import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "member"]);
export const bodyWeightDirection = pgEnum("body_weight_direction", [
	"lose",
	"gain",
	"maintain",
]);
export const exerciseTrackingType = pgEnum("exercise_tracking_type", [
	"reps_weight",
	"duration",
]);
export const exerciseMediaKind = pgEnum("exercise_media_kind", [
	"gif",
	"video",
]);
export const checklistKind = pgEnum("checklist_kind", ["warmup", "cooldown"]);
export const workoutLogStatus = pgEnum("workout_log_status", [
	"draft",
	"completed",
	"discarded",
]);
export const exerciseLogStatus = pgEnum("exercise_log_status", [
	"planned",
	"completed",
	"skipped",
]);

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	username: text("username").notNull().unique(),
	displayUsername: text("display_username"),
	role: userRole("role").notNull().default("member"),
	banned: boolean("banned"),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			withTimezone: true,
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			withTimezone: true,
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const partnerLinks = pgTable(
	"partner_links",
	{
		userAId: text("user_a_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		userBId: text("user_b_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.userAId, table.userBId] })],
);

export const bodyWeightGoals = pgTable("body_weight_goals", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	targetKg: text("target_kg").notNull(),
	direction: bodyWeightDirection("direction").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const workoutFrequencyGoals = pgTable("workout_frequency_goals", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	targetWorkoutsPerWeek: integer("target_workouts_per_week").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const reminderSettings = pgTable("reminder_settings", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	workoutReminderEnabled: boolean("workout_reminder_enabled")
		.notNull()
		.default(false),
	workoutReminderTime: text("workout_reminder_time"),
	weighInReminderEnabled: boolean("weigh_in_reminder_enabled")
		.notNull()
		.default(false),
	weighInReminderTime: text("weigh_in_reminder_time"),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const notificationDevices = pgTable(
	"notification_devices",
	{
		id: uuid("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		deviceId: text("device_id").notNull(),
		platform: text("platform").notNull(),
		pushToken: text("push_token"),
		notificationsEnabled: boolean("notifications_enabled")
			.notNull()
			.default(false),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("notification_devices_user_idx").on(table.userId)],
);

export const exercises = pgTable("exercises", {
	id: text("id").primaryKey(),
	name: text("name").notNull().unique(),
	description: text("description"),
	equipment: text("equipment"),
	trackingType: exerciseTrackingType("tracking_type").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const exerciseMedia = pgTable(
	"exercise_media",
	{
		id: text("id").primaryKey(),
		exerciseId: text("exercise_id")
			.notNull()
			.references(() => exercises.id, { onDelete: "cascade" }),
		kind: exerciseMediaKind("kind").notNull(),
		url: text("url").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
	},
	(table) => [index("exercise_media_exercise_idx").on(table.exerciseId)],
);

export const trainingPlanTemplates = pgTable("training_plan_templates", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	goal: text("goal"),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const userTrainingPlans = pgTable(
	"user_training_plans",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		templateId: text("template_id").references(() => trainingPlanTemplates.id, {
			onDelete: "set null",
		}),
		name: text("name").notNull(),
		activeAt: timestamp("active_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("user_training_plans_user_idx").on(table.userId)],
);

export const trainingDays = pgTable(
	"training_days",
	{
		id: text("id").primaryKey(),
		templateId: text("template_id")
			.notNull()
			.references(() => trainingPlanTemplates.id, { onDelete: "cascade" }),
		sequence: integer("sequence").notNull(),
		title: text("title").notNull(),
	},
	(table) => [index("training_days_template_idx").on(table.templateId)],
);

export const trainingDayChecklistItems = pgTable(
	"training_day_checklist_items",
	{
		id: text("id").primaryKey(),
		trainingDayId: text("training_day_id")
			.notNull()
			.references(() => trainingDays.id, { onDelete: "cascade" }),
		kind: checklistKind("kind").notNull(),
		text: text("text").notNull(),
		sortOrder: integer("sort_order").notNull(),
	},
	(table) => [index("training_day_checklist_day_idx").on(table.trainingDayId)],
);

export const plannedExercises = pgTable(
	"planned_exercises",
	{
		id: text("id").primaryKey(),
		trainingDayId: text("training_day_id")
			.notNull()
			.references(() => trainingDays.id, { onDelete: "cascade" }),
		exerciseId: text("exercise_id")
			.notNull()
			.references(() => exercises.id, { onDelete: "restrict" }),
		sortOrder: integer("sort_order").notNull(),
		targetSets: integer("target_sets").notNull(),
		targetMinReps: integer("target_min_reps"),
		targetMaxReps: integer("target_max_reps"),
		targetDurationSeconds: integer("target_duration_seconds"),
		restSeconds: integer("rest_seconds").notNull().default(90),
		notes: text("notes"),
	},
	(table) => [index("planned_exercises_day_idx").on(table.trainingDayId)],
);

export const plannedExerciseSubstitutes = pgTable(
	"planned_exercise_substitutes",
	{
		plannedExerciseId: text("planned_exercise_id")
			.notNull()
			.references(() => plannedExercises.id, { onDelete: "cascade" }),
		exerciseId: text("exercise_id")
			.notNull()
			.references(() => exercises.id, { onDelete: "restrict" }),
		targetSets: integer("target_sets"),
		targetMinReps: integer("target_min_reps"),
		targetMaxReps: integer("target_max_reps"),
		targetDurationSeconds: integer("target_duration_seconds"),
		notes: text("notes"),
	},
	(table) => [
		primaryKey({ columns: [table.plannedExerciseId, table.exerciseId] }),
	],
);

export const workoutLogs = pgTable(
	"workout_logs",
	{
		id: uuid("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		userTrainingPlanId: text("user_training_plan_id").references(
			() => userTrainingPlans.id,
			{ onDelete: "set null" },
		),
		trainingDayId: text("training_day_id")
			.notNull()
			.references(() => trainingDays.id, { onDelete: "restrict" }),
		status: workoutLogStatus("status").notNull().default("draft"),
		startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("workout_logs_user_started_idx").on(table.userId, table.startedAt),
		index("workout_logs_user_status_idx").on(table.userId, table.status),
	],
);

export const exerciseLogs = pgTable(
	"exercise_logs",
	{
		id: uuid("id").primaryKey(),
		workoutLogId: uuid("workout_log_id")
			.notNull()
			.references(() => workoutLogs.id, { onDelete: "cascade" }),
		plannedExerciseId: text("planned_exercise_id").references(
			() => plannedExercises.id,
			{ onDelete: "set null" },
		),
		plannedExerciseName: text("planned_exercise_name").notNull(),
		plannedExerciseTarget: text("planned_exercise_target").notNull(),
		restSeconds: integer("rest_seconds"),
		originalExerciseId: text("original_exercise_id").references(
			() => exercises.id,
			{
				onDelete: "set null",
			},
		),
		performedExerciseId: text("performed_exercise_id").references(
			() => exercises.id,
			{ onDelete: "set null" },
		),
		status: exerciseLogStatus("status").notNull().default("planned"),
		goodForm: boolean("good_form"),
		note: text("note"),
		skipReason: text("skip_reason"),
		substitutionNote: text("substitution_note"),
		sortOrder: integer("sort_order").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("exercise_logs_workout_idx").on(table.workoutLogId)],
);

export const setLogs = pgTable(
	"set_logs",
	{
		id: uuid("id").primaryKey(),
		exerciseLogId: uuid("exercise_log_id")
			.notNull()
			.references(() => exerciseLogs.id, { onDelete: "cascade" }),
		setIndex: integer("set_index").notNull(),
		weightKg: text("weight_kg"),
		reps: integer("reps"),
		durationSeconds: integer("duration_seconds"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("set_logs_exercise_idx").on(table.exerciseLogId)],
);

export const workoutChecklistLogs = pgTable(
	"workout_checklist_logs",
	{
		workoutLogId: uuid("workout_log_id")
			.notNull()
			.references(() => workoutLogs.id, { onDelete: "cascade" }),
		checklistItemId: text("checklist_item_id")
			.notNull()
			.references(() => trainingDayChecklistItems.id, { onDelete: "restrict" }),
		checked: boolean("checked").notNull().default(false),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.workoutLogId, table.checklistItemId] }),
	],
);

export const bodyWeightLogs = pgTable(
	"body_weight_logs",
	{
		id: uuid("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
		weightKg: text("weight_kg").notNull(),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("body_weight_logs_user_measured_idx").on(
			table.userId,
			table.measuredAt,
		),
	],
);

export const userRelations = relations(user, ({ many, one }) => ({
	bodyWeightLogs: many(bodyWeightLogs),
	bodyWeightGoal: one(bodyWeightGoals),
	workoutFrequencyGoal: one(workoutFrequencyGoals),
	reminderSettings: one(reminderSettings),
	notificationDevices: many(notificationDevices),
	trainingPlans: many(userTrainingPlans),
	workoutLogs: many(workoutLogs),
}));

export const bodyWeightLogsRelations = relations(bodyWeightLogs, ({ one }) => ({
	user: one(user, { fields: [bodyWeightLogs.userId], references: [user.id] }),
}));
