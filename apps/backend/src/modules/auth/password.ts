import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, hash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const storedKey = Buffer.from(hash, "base64url");
  const derivedKey = (await scryptAsync(
    password,
    salt,
    storedKey.length,
  )) as Buffer;

  return (
    storedKey.length === derivedKey.length &&
    timingSafeEqual(storedKey, derivedKey)
  );
}
