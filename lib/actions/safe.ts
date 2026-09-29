import "server-only";

import { unstable_rethrow } from "next/navigation";
import type { ActionFailure } from "./types";

/**
 * Next.js replaces the message of any error thrown from a server action with a generic
 * "An error occurred in the Server Components render" text in production builds. Actions run
 * through here return the friendly message instead, and `unwrap()` on the client throws it again,
 * so existing try/catch and .catch() handlers show the real reason. Redirects and notFound() still pass through.
 */
export async function runAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, args: A): Promise<R | ActionFailure> {
  try {
    return await fn(...args);
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error && error.message ? error.message : "Something went wrong. Refresh and try again.";
    return { __actionError: message.length > 300 ? `${message.slice(0, 300)}…` : message };
  }
}
