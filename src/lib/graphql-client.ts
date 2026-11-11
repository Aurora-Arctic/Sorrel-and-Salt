import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import { type Query, QueryClient, queryOptions, useMutation } from '@tanstack/react-query';
import type { GraphQLFormattedError } from 'graphql';
import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from '../graphql/csrf';
import { ACCESS_PAUSED_CODE, covenPausedPath } from './access-paused';
import { covenSlugOf } from './coven-path';
import { apiPath } from './api-path';
import { GraphQLClientError, StaleWriteError } from './graphql-client-error';
import { failureMessage } from './graphql-failure';
import { reportLeaving } from './navigation/store';
import type { VariablesArg } from './types';

// The browser's half of the API: a fetch wrapper and TanStack Query, with no second cache. Server components
// read through services (claude-docs/graphql/client.md, "The client").

const ENDPOINT = '/api/graphql';

/** Long enough that a remount or a second reader reuses the answer. */
const STALE_TIME_MS = 30_000;

const MAX_RETRIES = 2;

type GraphQLBody<TResult> = { data?: TResult | null; errors?: readonly GraphQLFormattedError[] };

/** A full navigation, since the paused page sits outside the coven's layout. */
function leaveIfCovenPaused(errors: readonly GraphQLFormattedError[] | undefined): void {
  if (!errors?.some(({ extensions }) => extensions?.code === ACCESS_PAUSED_CODE)) return;
  const slug = covenSlugOf(new URL(window.location.href).pathname);
  if (slug === null) return;
  reportLeaving();
  window.location.assign(covenPausedPath(slug));
}

// Read off the query text, since the parser stays out of the browser's bundle. Codegen writes
// each document from a parsed operation, so the keyword and name are the first thing in it.
const OPERATION_NAME = /^\s*(?:query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)/;

export function operationNameOf(
  document: DocumentTypeDecoration<unknown, never>,
): string | undefined {
  return OPERATION_NAME.exec(String(document))?.[1];
}

async function send<TResult, TVariables extends object>(
  document: DocumentTypeDecoration<TResult, TVariables>,
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
  const response = await fetch(new URL(apiPath(ENDPOINT), window.location.origin).href, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [CLIENT_HEADER]: CLIENT_HEADER_VALUE,
      // Asks for the GraphQL-over-HTTP media type first, which is what keeps
      // Yoga's status codes as they were under graphql-request.
      accept: 'application/graphql-response+json, application/json',
    },
    body: JSON.stringify({
      query: String(document),
      // graphql-request sent the name, and the workshop's stories answer by it.
      operationName: operationNameOf(document),
      variables,
    }),
    signal,
  });
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
    leaveIfCovenPaused(body?.errors);
    throw new GraphQLClientError({ status: response.status, errors: body?.errors });
  }
  return body.data;
}

/** Rejects with `GraphQLClientError` on any GraphQL error, so a partial answer never reads as whole. */
export function graphqlRequest<TResult, TVariables extends object>(
  document: DocumentTypeDecoration<TResult, TVariables>,
  ...[variables]: VariablesArg<TVariables>
): Promise<TResult> {
  return send(document, variables as TVariables | undefined);
}

export function saveRequest<Input extends object>(
  create: DocumentTypeDecoration<unknown, { input: Input }>,
  update: DocumentTypeDecoration<unknown, { id: string; input: Input }>,
): (input: Input, id: string | undefined) => Promise<void> {
  return async (input, id) => {
    if (id) {
      await graphqlRequest(update, { id, input });
      return;
    }
    // Widened, since `VariablesArg` cannot decide `{ input: Input }` while
    // `Input` is generic; the parameter has already held the document to it.
    const widened = create as DocumentTypeDecoration<unknown, { input: object }>;
    await graphqlRequest<unknown, { input: object }>(widened, { input });
  };
}

/**
 * A write that leaves the page on success. `onDone` follows the answer and `onRefused` gets the one
 * sentence to show for a failure. `pending` stays true past the answer, until the page the write led
 * to arrives, so a second press cannot ask again.
 */
export function useRefusableMutation<Variables = void, Result = unknown>({
  request,
  onDone,
  onRefused,
}: {
  request: (variables: Variables) => Promise<Result>;
  onDone: (result: Result, variables: Variables) => void;
  onRefused: (message: string) => void;
}): { run: (variables: Variables) => void; pending: boolean; reset: () => void } {
  const write = useMutation({
    mutationFn: request,
    onSuccess: onDone,
    onError: (error) => onRefused(failureMessage(error)),
  });
  return {
    run: (variables) => write.mutate(variables),
    pending: write.isPending || write.isSuccess,
    reset: write.reset,
  };
}

/** Codegen refuses two operations sharing a name, so the name is a unique key. */
export function graphqlQuery<TResult, TVariables extends object>(
  document: DocumentTypeDecoration<TResult, TVariables>,
  ...[variables]: VariablesArg<TVariables>
) {
  const name = operationNameOf(document);
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

/** A failed background refetch keeps the last answer on screen. */
export function throwWhenEmpty(_error: unknown, query: Pick<Query, 'state'>): boolean {
  return query.state.data === undefined;
}

/**
 * The client's defaults. Mutations keep TanStack's own — no retry, and errors
 * returned to the caller, because a form renders them field by field.
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
