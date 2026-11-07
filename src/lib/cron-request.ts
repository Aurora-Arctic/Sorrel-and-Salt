import { createHash, timingSafeEqual } from 'node:crypto';

// The check every Vercel Cron route makes before it starts its job (claude-docs/design-decisions/m15.46-daily-jobs-from-vercel-cron.md).

/** Compared as digests, so the time taken says nothing of the secret. False for every request while it is unset. */
export function cronAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || header === null) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
