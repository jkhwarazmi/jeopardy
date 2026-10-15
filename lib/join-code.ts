import crypto from "node:crypto";

// no I, L, O, 0 or 1 so codes are easy to read out
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  const len = 6;
  const alphabet = JOIN_CODE_ALPHABET;
  const values = new Uint8Array(len);

  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    crypto.webcrypto.getRandomValues(values);
  }

  let code = "";
  for (let i = 0; i < len; i++) {
    code += alphabet[values[i] % alphabet.length];
  }
  return code;
}

export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
