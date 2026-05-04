import { z } from "zod";

import { authRoleSchema } from "../auth/schemas.js";

export const timezoneSchema = z.string().trim().min(1).max(120);

export const apartmentMembershipSchema = z.object({
  id: z.string().min(1),
  role: authRoleSchema,
  canManageIntegrations: z.boolean(),
  canUpdateTaskStatus: z.boolean(),
  canView: z.boolean(),
});

export const apartmentSchema = z.object({
  id: z.string().min(1),
  membership: apartmentMembershipSchema,
  name: z.string().min(1),
  organizationId: z.string().min(1),
  timezone: timezoneSchema,
});

export const createApartmentRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  timezone: timezoneSchema,
});

export const createApartmentResponseSchema = z.object({
  apartment: apartmentSchema,
});

export const listApartmentsResponseSchema = z.object({
  apartments: z.array(apartmentSchema),
});

export type CreateApartmentRequest = z.infer<
  typeof createApartmentRequestSchema
>;
