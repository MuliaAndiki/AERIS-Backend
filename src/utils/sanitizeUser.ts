const SENSITIVE_FIELDS = [
  "password",
  "otp",
  "expOtp",
  "token",
  "activateToken",
  "activateExp",
] as const;

export function sanitizeUser<T extends Record<string, any>>(
  user: T,
): Omit<T, (typeof SENSITIVE_FIELDS)[number]> {
  if (!user) return user;
  const sanitized = { ...user };
  for (const field of SENSITIVE_FIELDS) {
    delete (sanitized as any)[field];
  }
  return sanitized;
}

export const safeUserSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  role: true,
  isVerify: true,
  avaUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;
