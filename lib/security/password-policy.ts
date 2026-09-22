const COMMON_PASSWORDS = new Set([
  "1234567890", "password1", "password12", "qwerty1234", "qwertyuiop", "admin12345", "welcome123", "letmein123", "abc1234567", "pakistan123", "karachi123", "1111111111",
]);

export function validateInvitePassword(password: string) {
  const normalized = password.trim().toLowerCase();
  if (password.length < 10) return { ok: false as const, reason: "Password must contain at least 10 characters." };
  if (COMMON_PASSWORDS.has(normalized)) return { ok: false as const, reason: "Choose a less common password." };
  return { ok: true as const };
}
