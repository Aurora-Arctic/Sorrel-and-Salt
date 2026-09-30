import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type Query, QueryClient, queryOptions } from '@tanstack/react-query';
import { getOperationAST } from 'graphql';
import { ClientError, request } from 'graphql-request';
import type { VariablesArg } from './types';

// The browser's half of the API: graphql-request sends a codegen document and
// TanStack Query caches the answer, with no second, normalized cache beside it
// (DESIGN.md §7). Server components never come through here — they read
// through services (CLAUDE.md rule 1). claude-docs/graphql.md, "The client".

const ENDPOINT = '/api/graphql';

/** Long enough that a remount or a second reader reuses the answer. */
const STALE_TIME_MS = 30_000;

/** Two retries, so three attempts in all. */
const MAX_RETRIES = 2;

async function send<TResult, TVariables extends object>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables | undefined,
  signal?: AbortSignal,
): Promise<TResult> {
  // Explicit, because graphql-request's own failure here is `new URL`'s
  // "Invalid URL": on the server there is no origin, and no cookie to send.
  if (typeof window === 'undefined') {
    throw new Error('The GraphQL client runs in the browser; a server component reads a service.');
  }
  // Typed by the result alone: `VariablesArg` has already held the variables
  // to the document's own at the call site.
  return request<TResult>({
    // graphql-request passes the url to `new URL`, which rejects a relative one.
    url: new URL(ENDPOINT, window.location.origin).href,
    document,
    variables,
    signal,
  });
}

/**
 * Runs one typed document against /api/graphql. Rejects with graphql-request's
 * `ClientError` on any GraphQL error, so a partial answer never reads as whole.
 */
export function graphqlRequest<TResult, TVariables extends object>(
  document: TypedDocumentNode<TResult, TVariables>,
  ...[variables]: VariablesArg<TVariables>
): Promise<TResult> {
  return send(document, variables as TVariables | undefined);
}

/**
 * Query options for `useQuery`, keyed `[operationName, variables]` — codegen
 * refuses two operations sharing a name, so the name is a unique key.
 */
export function graphqlQuery<TResult, TVariables extends object>(
  document: TypedDocumentNode<TResult, TVariables>,
  ...[variables]: VariablesArg<TVariables>
) {
  const name = getOperationAST(document)?.name?.value;
  if (name === undefined) {
    throw new Error('A GraphQL query needs an operation name to key its cache entry.');
  }
  return queryOptions({
    queryKey: [name, variables ?? {}] as const,
    queryFn: ({ signal }) => send(document, variables as TVariables | undefined, signal),
  });
}

/**
 * Retries only what never reached a GraphQL answer: a failed fetch, or a 5xx
 * from the platform. A GraphQL error comes back as a 200, and asking again
 * gets the same answer.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof ClientError) return error.response.status >= 500;
  // fetch rejects with a TypeError when the request never completes.
  return error instanceof TypeError;
}

/**
 * Sends a query's error to the nearest error boundary only while there is
 * nothing to show; a failed background refetch keeps the last answer on screen.
 */
export function throwWhenEmpty(_error: unknown, query: Pick<Query, 'state'>): boolean {
  return query.state.data === undefined;
}

/**
 * The client's defaults. Mutations keep TanStack's own — no retry, and errors
 * returned to the caller, because a form renders them field by field (MB.43).
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        retry: shouldRetry,
        throwOnError: throwWhenEmpty,
      },
    },
  });
}
