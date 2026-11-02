/**
 * Whether Better Auth calls a session created at `createdAt` fresh, given its resolved `freshAge` in seconds; 0 turns
 * the check off, as it does in Better Auth's own `freshSessionMiddleware`.
 */
export function isFreshSession(createdAt: Date | string, freshAge: number): boolean {
  if (freshAge === 0) return true;
  return Date.now() - new Date(createdAt).getTime() < freshAge * 1000;
}
