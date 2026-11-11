import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import superjson from 'superjson';

const HELP_TAG = 'help';

// An hour is the longest a changed help article can lag; every write expires the tag at once.
const HELP_REVALIDATE_SECONDS = 3600;

// A new deployment starts with a cold cache, so a changed read shape never meets old entries.
function deploymentKeyPart(): string[] {
  const id = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
  return id ? [id] : [];
}

// superjson keeps Dates as Dates across the cache's JSON round trip.
export function cachedHelpRead<A extends unknown[], R>(
  key: string,
  read: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const cached = unstable_cache(
    async (...args: A) => superjson.stringify(await read(...args)),
    [key, ...deploymentKeyPart()],
    { tags: [HELP_TAG], revalidate: HELP_REVALIDATE_SECONDS },
  );
  return async (...args: A) => superjson.parse<R>(await cached(...args));
}

export function expireHelp(): void {
  revalidateTag(HELP_TAG, { expire: 0 });
}
