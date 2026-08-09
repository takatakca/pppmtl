/** Shared, framework-free validation used by the customer auth forms. */

export function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export function usernameError(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < 3) return "Username must be at least 3 characters.";
  if (u.length > 30) return "Username must be 30 characters or fewer.";
  return null;
}

export function emailError(raw: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim()) ? null : "Enter a valid email address.";
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(pw: string): PasswordStrength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Strong", "Excellent"] as const;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped] };
}

export function passwordError(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters.";
  return null;
}

/** Only in-app routes may be returned to after sign-in — no open redirects. */
const RETURN_ALLOWLIST = ["/", "/order", "/offers", "/account"];

export function safeReturnTo(raw: string | undefined): string {
  if (!raw) return "/account";
  return RETURN_ALLOWLIST.includes(raw) ? raw : "/account";
}

/** m•••@example.com — never echo the full address back after submission. */
export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}•••@${domain}`;
}

/** The name PPP uses everywhere once confirmed — short, human, one-time. */
export function preferredNameError(raw: string): string | null {
  const n = raw.trim();
  if (n.length < 2) return "Use at least 2 characters.";
  if (n.length > 24) return "Keep it to 24 characters or fewer.";
  if (!/^[\p{L}\p{M}][\p{L}\p{M}'’\- ]*$/u.test(n)) return "Letters, spaces, hyphens only.";
  return null;
}
