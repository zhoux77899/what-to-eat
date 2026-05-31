import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getMasterKey() {
  const rawKey = process.env.MASTER_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("MASTER_ENCRYPTION_KEY is required");
  }

  const key = Buffer.from(rawKey, "base64");

  if (key.length !== 32) {
    throw new Error("MASTER_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string) {
  const [ivValue, authTagValue, encryptedValue] = payload.split(".");

  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Encrypted payload is malformed");
  }

  const decipher = createDecipheriv(ALGORITHM, getMasterKey(), Buffer.from(ivValue, "base64"), {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(Buffer.from(authTagValue, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final()
  ]).toString("utf8");
}
