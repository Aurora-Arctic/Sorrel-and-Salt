## The client

A client component reads through `graphql-request` and TanStack Query, not
Apollo, whose normalized cache would duplicate TanStack Query's and add ~40 kB
(DESIGN.md §7). `src/lib/graphql-client.ts` holds the whole of it:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { graphql } from '@/gql';
import { graphqlQuery } from '@/lib/graphql-client';

const OkQuery = graphql(`
  query Ok {
    ok
  }
`);

export function Ok() {
  const { data } = useQuery(graphqlQuery(OkQuery)); // data: { ok: boolean } | undefined
  return <p>{data?.ok ? 'Up' : 'Checking…'}</p>;
}
```

- **`graphqlQuery(document, variables)`** returns `queryOptions` keyed
  `[operationName, variables]`. Codegen refuses two operations with one name, so
  the name alone identifies the document, and an invalidation after a mutation
  names it: `queryClient.invalidateQueries({ queryKey: ['Ok'] })`. An anonymous
  operation throws, having nothing to key by.
- **`graphqlRequest(document, variables)`** is the same request outside a
  query — a mutation's `mutationFn`. Both require the variables a document
  declares and accept none when it declares none, checked by `tsc`.
- **Browser only.** The endpoint is resolved against `window.location`, so the
  session cookie rides along same-origin. On the server the call throws: a
  server component reads a service directly (CLAUDE.md rule 1), and a client
  component rendered on the server should use `useQuery`, which does not fetch
  there, rather than `useSuspenseQuery`, which would.
- **A GraphQL error rejects.** `graphql-request` throws a `ClientError` whenever
  the response carries `errors`, so a partial answer never reads as whole. Its
  `response.errors[].extensions` carries the code and field errors (MB.43).

### Defaults

`makeQueryClient()` sets them, for queries only:

| Option         | Value            | Why                                                                                                                                                        |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staleTime`    | 30 s             | A remount, or a second component asking the same thing, reuses the answer instead of refetching at once.                                                   |
| `retry`        | `shouldRetry`    | Twice, and only for a fetch that failed or a 5xx. A GraphQL error arrives as a 200 and a 4xx is the request's fault: both would get the same answer again. |
| `throwOnError` | `throwWhenEmpty` | To the nearest error boundary while there is no data to show. A failed background refetch keeps the last answer on screen.                                 |

Mutations keep TanStack Query's own: no retry, since a write is not safely
repeatable, and the error returned to the caller, because a form renders it
field by field rather than replacing the page.

### The provider

`src/app/providers.tsx` mounts one `QueryClientProvider`, and the root layout
wraps the page in it — the page only, since the theme toggle and backdrop
query nothing. A second provider nested lower would split the cache, so an
invalidation in one tree would miss the other; `tests/guards/graphql-client.test.ts`
fails a second one, and fails any Apollo package in the lockfile.

The browser keeps one client for the tab, in a module variable rather than
`useState`, which React throws away if the first render suspends. A server
render builds its own, so one request's cache never reaches another's. The
tab's cache is not keyed by viewer (CLAUDE.md rule 6), so whatever signs a
user out must end with a full navigation or `queryClient.clear()`, or the next
account in the tab reads the last one's answers until they go stale.
