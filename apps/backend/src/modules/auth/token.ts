import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

import type { Env } from "../../shared/env.js";
import type { AuthUser } from "./types.js";

const textEncoder = new TextEncoder();
const accessTokenPayloadSchema = z.object({
  email: z.string().email(),
  sub: z.string().min(1),
  type: z.literal("access"),
});

export type AccessTokenPayload = {
  sub: string;
  email: string;
  type: "access";
};

function getJwtSecret(env: Env): Uint8Array {
  return textEncoder.encode(env.AUTH_JWT_SECRET);
}

export async function issueAccessToken(
  user: AuthUser,
  env: Env,
): Promise<string> {
  return await new SignJWT({
    email: user.email,
    type: "access",
  } satisfies Omit<AccessTokenPayload, "sub">)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(env.SERVICE_NAME)
    .setAudience(env.SERVICE_NAME)
    .setExpirationTime("12h")
    .sign(getJwtSecret(env));
}

export async function verifyAccessToken(
  token: string,
  env: Env,
): Promise<AccessTokenPayload> {
  const result = await jwtVerify(token, getJwtSecret(env), {
    algorithms: ["HS256"],
    audience: env.SERVICE_NAME,
    issuer: env.SERVICE_NAME,
  });

  return accessTokenPayloadSchema.parse({
    email: result.payload.email,
    sub: result.payload.sub,
    type: result.payload.type,
  });
}
