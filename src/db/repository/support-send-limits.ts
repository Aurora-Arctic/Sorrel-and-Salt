import { sql } from 'drizzle-orm';
import { rateLimits } from '../../modules/identity/schema/auth';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';

// Not `find…`: the soft-delete guard holds every `find` export to a tombstone filter, and this table has no tombstone.
/**
 * Counts one attempt under `key` in a single statement, so attempts racing each other all count, and returns the count in
 * the window. The count starts over at one when the last attempt came more than `windowMs` before `now`. Outside `withAudit`: the
 * table has no audit columns, and a signed-out send has no session to audit. Better Auth's limiter keeps its rows in the same
 * table, so a key is prefixed by the caller to stay clear of its `<address>|<path>` keys.
 */
export async function countSupportSendAttempt(
  key: string,
  now: Date,
  windowMs: number,
): Promise<number> {
  const at = now.getTime();
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, lastRequest: at })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.lastRequest} > ${at - windowMs} then ${rateLimits.count} + 1 else 1 end`,
        lastRequest: at,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count;
}
