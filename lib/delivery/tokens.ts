import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createDriverToken() {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}
