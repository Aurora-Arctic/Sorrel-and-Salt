import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import superjson from 'superjson';

export const DOCUMENTS_TAG = 'documents';

// An hour is the longest a published document can lag; a publish expires the tag at once.
export const DOCUMENTS_REVALIDATE_SECONDS = 3600;

// A new deployment starts with a cold cache, so a changed read shape never meets old entries.
function deploymentKeyPart(): string[] {
  const id = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
  return id ? [id] : [];
}

// superjson keeps Dates as Dates across the cache's JSON round trip.
export function cachedDocumentRead<A extends unknown[], R>(
  key: string,
  read: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const cached = unstable_cache(
    async (...args: A) => superjson.stringify(await read(...args)),
    [key, ...deploymentKeyPart()],
    { tags: [DOCUMENTS_TAG], revalidate: DOCUMENTS_REVALIDATE_SECONDS },
  );
  return async (...args: A) => superjson.parse<R>(await cached(...args));
}

export function expireDocuments(): void {
  revalidateTag(DOCUMENTS_TAG, { expire: 0 });
}
