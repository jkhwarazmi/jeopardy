/**
 * Join code generation and normalization.
 * Uses unambiguous uppercase alphabet (no I, L, O, 0, 1).
 */

import crypto from "node:crypto";

export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generate a 6-character join code using crypto-strength randomness.
 */
export function generateJoinCode(): string {
  const len = 6;
  const alphabet = JOIN_CODE_ALPHABET;
  const values = new Uint8Array(len);

  // Use crypto.getRandomValues where available (browser + Node 15+)
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    // Node.js environment
    crypto.webcrypto.getRandomValues(values);
  }

  let code = "";
  for (let i = 0; i < len; i++) {
    code += alphabet[values[i] % alphabet.length];
  }
  return code;
}

/**
 * Normalize a join code (uppercase, trim, strip spaces).
 */
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
