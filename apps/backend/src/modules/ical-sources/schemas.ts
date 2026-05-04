import { z } from "zod";

export const createIcalSourceRequestSchema = z.object({
  icalUrl: z.string().trim().url().max(2048),
  label: z.string().trim().min(1).max(120),
  provider: z.string().trim().min(1).max(80),
});

export const icalSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  lastFailureAt: z.string().datetime().nullable(),
  lastSuccessAt: z.string().datetime().nullable(),
  provider: z.string().min(1),
  syncEnabled: z.boolean(),
});

export const listIcalSourcesResponseSchema = z.object({
  icalSources: z.array(icalSourceSchema),
});

export const createIcalSourceResponseSchema = z.object({
  icalSource: icalSourceSchema,
});

export type CreateIcalSourceRequest = z.infer<
  typeof createIcalSourceRequestSchema
>;
