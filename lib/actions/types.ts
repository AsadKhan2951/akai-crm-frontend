/** What a wrapped server action returns instead of throwing (production hides thrown messages). */
export type ActionFailure = { __actionError: string };

export function isActionFailure(value: unknown): value is ActionFailure {
  return typeof value === "object" && value !== null && "__actionError" in value;
}
