import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

// returns "salt:hash" in hex
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

// returns false rather than throwing if the stored hash is malformed
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(hashHex, "hex");

    if (salt.length !== SALT_LENGTH || storedHash.length !== KEY_LENGTH) {
      return false;
    }

    const hash = scryptSync(password, salt, KEY_LENGTH);
    return timingSafeEqual(hash, storedHash);
  } catch {
    return false;
  }
}
