import type {
  AuthMembership,
  AuthOrganization,
  AuthUser,
  AuthenticatedUser,
  AuthenticatedUserWithPassword,
  PasswordResetTokenRecord,
} from "./types.js";

export type CreateUserInput = {
  email: string;
  fullName: string;
  authProvider: string;
  authSubject: string;
  passwordHash?: string | null;
};

export type CreateOrganizationInput = {
  name: string;
};

export type CreateOrganizationMembershipInput = {
  organizationId: string;
  userId: string;
  role: AuthMembership["role"];
};

export type CreatePasswordResetTokenInput = {
  expiresAt: Date;
  tokenHash: string;
  userId: string;
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthenticatedUser | null>;
  findUserCredentialByEmail(
    email: string,
  ): Promise<AuthenticatedUserWithPassword | null>;
  findUserById(userId: string): Promise<AuthenticatedUser | null>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
  updateUserPasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<AuthUser>;
  createPasswordResetToken(
    input: CreatePasswordResetTokenInput,
  ): Promise<PasswordResetTokenRecord>;
  findPasswordResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenUsed(tokenId: string): Promise<void>;
  createOrganization(input: CreateOrganizationInput): Promise<AuthOrganization>;
  createOrganizationMembership(
    input: CreateOrganizationMembershipInput,
  ): Promise<AuthMembership>;
}
