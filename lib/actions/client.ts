import { isActionFailure, type ActionFailure } from "./types";

/** Client side of runAction(): turns a returned failure back into a thrown Error with the real message. */
export function unwrap<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<Exclude<R, ActionFailure>> {
  return async (...args: A) => {
    const result = await fn(...args);
    if (isActionFailure(result)) throw new Error(result.__actionError);
    return result as Exclude<R, ActionFailure>;
  };
}
