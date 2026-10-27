import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type Query, QueryClient, queryOptions } from '@tanstack/react-query';
import { type GraphQLFormattedError, getOperationAST, print } from 'graphql';
import { apiPath } from './api-path';
import { GraphQLClientError, StaleWriteError } from './graphql-client-error';
import type { VariablesArg } from './types';

// The browser's half of the API: a small fetch wrapper sends a codegen document and
// TanStack Query caches the answer, with no second, normalized cache beside it
// (DESIGN.md §7). Server components never come through here — they read
// through services (CLAUDE.md rule 1). claude-docs/graphql/client.md, "The client".

const ENDPOINT = '/api/graphql';

/** Long enough that a remount or a second reader reuses the answer. */
const STALE_TIME_MS = 30_000;

/** Two retries, so three attempts in all. */
const MAX_RETRIES = 2;

/** What Yoga sends back, as far as the client reads it. */
type GraphQLBody<TResult> = { data?: TResult | null; errors?: readonly GraphQLFormattedError[] };

async function send<TResult, TVariables extends object>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables | undefined,
  signal?: AbortSignal,
): Promise<TResult> {
  // Explicit, because the failure here would otherwise be `new URL`'s
  // "Invalid URL": on the server there is no origin, and no cookie to send.
  if (typeof window === 'undefined') {
    throw new Error('The GraphQL client runs in the browser; a server component reads a service.');
  }
  // `fetch` is looked up here, on every request, never captured at import, so
  // a story or test can stand in for `window.fetch` after the module loads.
  const response = await fetch(
    // `new URL` resolves the relative path against the page's origin.
    new URL(apiPath(ENDPOINT), window.location.origin).href,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Asks for the GraphQL-over-HTTP media type first, which is what keeps
        // Yoga's status codes as they were under graphql-request.
        accept: 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({
        query: print(document),
        // graphql-request sent the name, and the workshop's stories answer by it.
        operationName: getOperationAST(document)?.name?.value,
        variables,
      }),
      signal,
    },
  );
  // A gateway's HTML page or an empty body is not JSON; the status still says what happened.
  const body = (await response.json().catch(() => undefined)) as GraphQLBody<TResult> | undefined;
  // Typed by the result alone: `VariablesArg` has already held the variables
  // to the document's own at the call site. A partial answer never resolves.
  if (!response.ok || body?.errors?.length || body?.data == null) {
    const stale = body?.errors?.find(({ extensions }) => extensions?.code === 'STALE_WRITE');
    const currentRevision = stale?.extensions?.currentRevision;
    if (typeof currentRevision === 'number') {
      throw new StaleWriteError({ status: response.status, errors: body?.errors, currentRevision });
    }
    throw new GraphQLClientError({ status: response.status, errors: body?.errors });
  }
  return body.data;
}

/**
 * Runs one typed document against /api/graphql. Rejects with
 * `GraphQLClientError` on any GraphQL error, so a partial answer never reads as whole,
 * and with its `StaleWriteError` subclass when the answer is STALE_WRITE.
 */
export function graphqlRequest<TResult, TVariables extends object>(
  document: TypedDocumentNode<TResult, TVariables>,
  ...[variables]: VariablesArg<TVariables>
): Promise<TResult> {
  return send(document, variables as TVariables | undefined);
}

/**
 * A save that creates a row, or with its `id` updates that one, through the
 * two documents given: the admin vocabulary forms' `if (id) update else
 * create`, written once for every kind they declare (MB.115).
 */
export function saveRequest<Input extends object>(
  create: TypedDocumentNode<unknown, { input: Input }>,
  update: TypedDocumentNode<unknown, { id: string; input: Input }>,
): (input: Input, id: string | undefined) => Promise<void> {
  return async (input, id) => {
    if (id) {
      await graphqlRequest(update, { id, input });
      return;
    }
    // Widened, since `VariablesArg` cannot decide `{ input: Input }` while
    // `Input` is generic; the parameter has already held the document to it.
    const widened = create as TypedDocumentNode<unknown, { input: object }>;
    await graphqlRequest<unknown, { input: object }>(widened, { input });
  };
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
  if (error instanceof GraphQLClientError) return error.status >= 500;
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
