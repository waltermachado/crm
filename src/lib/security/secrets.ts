import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { getServerEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function hasSecretEncryptionConfig() {
  return Boolean(getServerEnv().INTEGRATION_ENCRYPTION_KEY);
}

function getRequiredSecretKey() {
  const env = getServerEnv();

  if (!env.INTEGRATION_ENCRYPTION_KEY) {
    throw new AppError("INTEGRATION_ENCRYPTION_KEY is not configured.", {
      code: "INTEGRATION_ENCRYPTION_KEY_MISSING",
      statusCode: 500,
    });
  }

  return deriveKey(env.INTEGRATION_ENCRYPTION_KEY);
}

export function encryptSecret(value: string) {
  const key = getRequiredSecretKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string) {
  const key = getRequiredSecretKey();
  const [ivValue, authTagValue, encryptedValue] = payload.split(".");

  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new AppError("Invalid encrypted secret payload.", {
      code: "INVALID_SECRET_PAYLOAD",
      statusCode: 500,
    });
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
