import { z } from "zod";
import { isoDateTimeSchema, userIdSchema, uuidSchema } from "./sync.js";

export const bodyWeightDirectionSchema = z.enum(["lose", "gain", "maintain"]);

export const kgSchema = z.number().positive().max(500).multipleOf(0.1);

export const bodyWeightGoalSchema = z.object({
	userId: userIdSchema,
	targetKg: kgSchema,
	direction: bodyWeightDirectionSchema,
	updatedAt: isoDateTimeSchema,
});

export const bodyWeightLogSchema = z.object({
	id: uuidSchema,
	userId: userIdSchema,
	measuredAt: isoDateTimeSchema,
	weightKg: kgSchema,
	note: z.string().trim().max(500).optional(),
	createdAt: isoDateTimeSchema,
	updatedAt: isoDateTimeSchema,
	deletedAt: isoDateTimeSchema.optional(),
});

export type BodyWeightDirection = z.infer<typeof bodyWeightDirectionSchema>;
export type BodyWeightGoal = z.infer<typeof bodyWeightGoalSchema>;
export type BodyWeightLog = z.infer<typeof bodyWeightLogSchema>;
