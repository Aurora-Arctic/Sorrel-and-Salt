/** `freshAge` 0 turns the check off, as in Better Auth's `freshSessionMiddleware`. */
export function isFreshSession(createdAt: Date | string, freshAge: number): boolean {
  if (freshAge === 0) return true;
  return Date.now() - new Date(createdAt).getTime() < freshAge * 1000;
}
