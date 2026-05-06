import { z } from "zod";

export const authRoleSchema = z.enum(["host_admin", "co_host", "team"]);

export const signUpRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(1).max(120),
  organizationName: z.string().trim().min(1).max(120).optional(),
});

const passwordSchema = z.string().min(8).max(128);

export const passwordSignUpRequestSchema = signUpRequestSchema.extend({
  password: passwordSchema,
});

export const signInRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export const changePasswordRequestSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

export const requestPasswordResetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export const resetPasswordRequestSchema = z.object({
  newPassword: passwordSchema,
  token: z.string().trim().min(16),
});

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1),
});

export const organizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const membershipSchema = z.object({
  id: z.string().min(1),
  role: authRoleSchema,
  isActive: z.boolean(),
  organization: organizationSchema,
});

export const signUpResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: authUserSchema,
  organization: organizationSchema,
});

export const meResponseSchema = z.object({
  user: authUserSchema,
  memberships: z.array(membershipSchema),
});

export const passwordResetRequestedResponseSchema = z.object({
  resetToken: z.string().min(1).nullable().optional(),
});

export const okResponseSchema = z.object({
  ok: z.literal(true),
});

export type SignUpRequest = z.infer<typeof signUpRequestSchema>;
export type PasswordSignUpRequest = z.infer<typeof passwordSignUpRequestSchema>;
export type SignInRequest = z.infer<typeof signInRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export type RequestPasswordResetRequest = z.infer<
  typeof requestPasswordResetRequestSchema
>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type SignUpResponse = z.infer<typeof signUpResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
