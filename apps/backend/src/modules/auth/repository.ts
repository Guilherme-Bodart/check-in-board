import type {
  AuthMembership,
  AuthOrganization,
  AuthUser,
  AuthenticatedUser,
} from "./types.js";

export type CreateUserInput = {
  email: string;
  fullName: string;
  authProvider: string;
  authSubject: string;
};

export type CreateOrganizationInput = {
  name: string;
};

export type CreateOrganizationMembershipInput = {
  organizationId: string;
  userId: string;
  role: AuthMembership["role"];
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthenticatedUser | null>;
  findUserById(userId: string): Promise<AuthenticatedUser | null>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
  createOrganization(input: CreateOrganizationInput): Promise<AuthOrganization>;
  createOrganizationMembership(
    input: CreateOrganizationMembershipInput,
  ): Promise<AuthMembership>;
}
