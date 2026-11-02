import { createHash, timingSafeEqual } from 'node:crypto';

// The check every Vercel Cron route makes before it starts its job (claude-docs/design-decisions/m15.46-daily-jobs-from-vercel-cron.md).

/**
 * Whether `request` carries `Authorization: Bearer` and the CRON_SECRET environment variable, as Vercel Cron sends it. False for
 * any other header, and for every request while the secret is unset. Compared as digests, so the time taken says nothing of it.
 */
export function cronAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || header === null) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
