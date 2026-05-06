import { z } from "zod";

import { authRoleSchema } from "../auth/schemas.js";

const memberRoleSchema = z.enum(["co_host", "team"]);

export const apartmentMemberSchema = z.object({
  canManageIntegrations: z.boolean(),
  canUpdateTaskStatus: z.boolean(),
  canView: z.boolean(),
  email: z.string().email(),
  fullName: z.string().min(1),
  id: z.string().min(1),
  role: authRoleSchema,
  userId: z.string().min(1),
});

export const listMembersResponseSchema = z.object({
  members: z.array(apartmentMemberSchema),
});

export const createInvitationRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  role: memberRoleSchema,
});

export const invitationSchema = z.object({
  apartmentId: z.string().nullable(),
  email: z.string().email(),
  expiresAt: z.string().datetime(),
  id: z.string().min(1),
  role: memberRoleSchema,
  status: z.enum(["pending", "accepted", "revoked", "expired"]),
  token: z.string().min(1).optional(),
});

export const createInvitationResponseSchema = z.object({
  invitation: invitationSchema,
});

export const acceptInvitationRequestSchema = z.object({
  token: z.string().min(20),
});

export const acceptInvitationResponseSchema = z.object({
  invitation: invitationSchema.omit({ token: true }),
});
