import { createHash, timingSafeEqual } from 'node:crypto';
import { requestOrigin } from '@/lib/request-origin';

// The check every Vercel Cron route makes before it starts its job (claude-docs/design-decisions/support.md, "Daily jobs start from Vercel Cron, and no job sleeps waiting").

/** Compared as digests, so the time taken says nothing of the secret. False for every request while it is unset. */
export function cronAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || header === null) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/**
 * The `GET` handler of a Vercel Cron route: it takes no session and reads and returns no application data, and only starts
 * the day's job, so it is no third access path (rule 1). A request without `CRON_SECRET` is refused with 401 before the job
 * runs, and a started job answers 204. The job reads the origin only if it mails links, and reads it against Better Auth's
 * allowed hosts, so a forged Host cannot point those links elsewhere.
 */
export function cronRoute(
  job: (origin: () => Promise<string>) => Promise<unknown>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!cronAuthorised(request)) return new Response(null, { status: 401 });
    await job(() => requestOrigin(request, '/'));
    return new Response(null, { status: 204 });
  };
}
