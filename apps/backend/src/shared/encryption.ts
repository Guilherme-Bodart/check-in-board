import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import type { Env } from "./env.js";

const algorithm = "aes-256-gcm";
const encryptedValuePrefix = "v1:";

function getEncryptionKey(env: Env) {
  return createHash("sha256")
    .update(env.ICAL_URL_ENCRYPTION_KEY ?? env.AUTH_JWT_SECRET)
    .digest();
}

export function encryptSecret(value: string, env: Env) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getEncryptionKey(env), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${encryptedValuePrefix}${Buffer.concat([iv, authTag, ciphertext]).toString("base64url")}`;
}

export function decryptSecret(value: string, env: Env) {
  if (!value.startsWith(encryptedValuePrefix)) {
    return Buffer.from(value, "base64").toString("utf8");
  }

  const payload = Buffer.from(
    value.slice(encryptedValuePrefix.length),
    "base64url",
  );
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv(algorithm, getEncryptionKey(env), iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
