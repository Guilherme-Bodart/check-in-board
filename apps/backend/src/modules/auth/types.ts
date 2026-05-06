export type AuthRole = "host_admin" | "co_host" | "team";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
};

export type AuthOrganization = {
  id: string;
  name: string;
};

export type AuthMembership = {
  id: string;
  role: AuthRole;
  isActive: boolean;
  organization: AuthOrganization;
};

export type AuthenticatedUser = AuthUser & {
  memberships: AuthMembership[];
};

export type AuthenticatedUserWithPassword = AuthenticatedUser & {
  passwordHash: string | null;
};

export type SignUpInput = {
  email: string;
  fullName: string;
  organizationName?: string;
};

export type PasswordSignUpInput = SignUpInput & {
  password: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  userId: string;
};

export type RequestPasswordResetInput = {
  email: string;
};

export type ResetPasswordInput = {
  newPassword: string;
  token: string;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
};
