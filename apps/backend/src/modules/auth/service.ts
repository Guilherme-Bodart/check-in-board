import type { Env } from "../../shared/env.js";
import type { AuthRepository } from "./repository.js";
import { issueAccessToken } from "./token.js";
import type {
  AuthMembership,
  AuthenticatedUser,
  SignUpInput,
} from "./types.js";

function getDefaultOrganizationName(fullName: string): string {
  return `${fullName} Organization`;
}

function getPrimaryMembership(
  memberships: AuthMembership[],
): AuthMembership | null {
  return (
    memberships.find((membership) => membership.isActive) ??
    memberships[0] ??
    null
  );
}

export async function signUpWithDevAuth(
  input: SignUpInput,
  repository: AuthRepository,
  env: Env,
) {
  if (env.NODE_ENV === "production") {
    throw new Error("DEV_AUTH_DISABLED");
  }

  let user = await repository.findUserByEmail(input.email);

  if (!user) {
    const createdUser = await repository.createUser({
      authProvider: "dev",
      authSubject: `dev:${input.email}`,
      email: input.email,
      fullName: input.fullName,
    });

    user = {
      ...createdUser,
      memberships: [],
    };
  }

  let membership = getPrimaryMembership(user.memberships);

  if (!membership) {
    const organization = await repository.createOrganization({
      name:
        input.organizationName ?? getDefaultOrganizationName(input.fullName),
    });

    membership = await repository.createOrganizationMembership({
      organizationId: organization.id,
      role: "host_admin",
      userId: user.id,
    });

    user = await repository.findUserById(user.id);
  }

  if (!user || !membership) {
    throw new Error("SIGN_UP_FAILED");
  }

  const accessToken = await issueAccessToken(user, env);
  const organization = membership.organization;

  return {
    accessToken,
    organization,
    user: {
      email: user.email,
      fullName: user.fullName,
      id: user.id,
    },
  };
}

export async function getAuthenticatedUser(
  userId: string,
  repository: AuthRepository,
): Promise<AuthenticatedUser | null> {
  return await repository.findUserById(userId);
}
