import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const userIdSchema = z.string().min(1);
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const syncMetadataSchema = z.object({
	id: uuidSchema,
	createdAt: isoDateTimeSchema,
	updatedAt: isoDateTimeSchema,
	deletedAt: isoDateTimeSchema.optional(),
});

export type SyncMetadata = z.infer<typeof syncMetadataSchema>;
