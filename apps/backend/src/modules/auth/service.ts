import { createHash, randomBytes } from "node:crypto";

import type { Env } from "../../shared/env.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { AuthRepository } from "./repository.js";
import { issueAccessToken } from "./token.js";
import type {
  AuthMembership,
  AuthenticatedUser,
  ChangePasswordInput,
  PasswordSignUpInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "./types.js";

export class AuthServiceError extends Error {
  constructor(
    public readonly code:
      | "EMAIL_ALREADY_REGISTERED"
      | "INVALID_CREDENTIALS"
      | "INVALID_RESET_TOKEN",
    message: string,
  ) {
    super(message);
  }
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createResetToken() {
  return randomBytes(32).toString("base64url");
}

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

export async function signUpWithPassword(
  input: PasswordSignUpInput,
  repository: AuthRepository,
  env: Env,
) {
  let user = await repository.findUserCredentialByEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  if (user?.passwordHash) {
    throw new AuthServiceError(
      "EMAIL_ALREADY_REGISTERED",
      "This email already has an account. Try signing in.",
    );
  }

  if (!user) {
    const createdUser = await repository.createUser({
      authProvider: "password",
      authSubject: `password:${input.email}`,
      email: input.email,
      fullName: input.fullName,
      passwordHash,
    });

    user = {
      ...createdUser,
      memberships: [],
      passwordHash,
    };
  } else {
    await repository.updateUserPasswordHash(user.id, passwordHash);
    user = {
      ...user,
      passwordHash,
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

    user = await repository.findUserCredentialByEmail(input.email);
  }

  if (!user || !membership) {
    throw new Error("PASSWORD_SIGN_UP_FAILED");
  }

  const accessToken = await issueAccessToken(user, env);

  return {
    accessToken,
    organization: membership.organization,
    user: {
      email: user.email,
      fullName: user.fullName,
      id: user.id,
    },
  };
}

export async function signInWithPassword(
  input: SignInInput,
  repository: AuthRepository,
  env: Env,
) {
  const user = await repository.findUserCredentialByEmail(input.email);

  if (!user?.passwordHash) {
    throw new AuthServiceError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new AuthServiceError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  const membership = getPrimaryMembership(user.memberships);

  if (!membership) {
    throw new Error("AUTH_USER_WITHOUT_MEMBERSHIP");
  }

  const accessToken = await issueAccessToken(user, env);

  return {
    accessToken,
    organization: membership.organization,
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

export async function changePasswordForUser(
  input: ChangePasswordInput,
  repository: AuthRepository,
) {
  const user = await repository.findUserCredentialByEmail(
    (await repository.findUserById(input.userId))?.email ?? "",
  );

  if (!user?.passwordHash) {
    throw new AuthServiceError(
      "INVALID_CREDENTIALS",
      "Current password is incorrect.",
    );
  }

  const isCurrentPasswordValid = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isCurrentPasswordValid) {
    throw new AuthServiceError(
      "INVALID_CREDENTIALS",
      "Current password is incorrect.",
    );
  }

  await repository.updateUserPasswordHash(
    input.userId,
    await hashPassword(input.newPassword),
  );
}

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  repository: AuthRepository,
  env: Env,
) {
  const user = await repository.findUserCredentialByEmail(input.email);

  if (!user?.passwordHash) {
    return {
      resetToken: env.AUTH_PASSWORD_RESET_EXPOSE_TOKEN ? null : undefined,
    };
  }

  const resetToken = createResetToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await repository.createPasswordResetToken({
    expiresAt,
    tokenHash: hashResetToken(resetToken),
    userId: user.id,
  });

  return {
    resetToken: env.AUTH_PASSWORD_RESET_EXPOSE_TOKEN ? resetToken : undefined,
  };
}

export async function resetPasswordWithToken(
  input: ResetPasswordInput,
  repository: AuthRepository,
) {
  const token = await repository.findPasswordResetTokenByHash(
    hashResetToken(input.token),
  );

  if (
    !token ||
    token.usedAt ||
    new Date(token.expiresAt).getTime() < Date.now()
  ) {
    throw new AuthServiceError(
      "INVALID_RESET_TOKEN",
      "Password reset token is invalid or expired.",
    );
  }

  await repository.updateUserPasswordHash(
    token.userId,
    await hashPassword(input.newPassword),
  );
  await repository.markPasswordResetTokenUsed(token.id);
}
