import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createDriverToken() {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/** Driver links carry the raw token; the database only stores (and is queried by) its SHA-256 hash. */
export function hashDriverToken(rawToken: string): string | null {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(rawToken)) return null;
  return createHash("sha256").update(rawToken).digest("hex");
}
