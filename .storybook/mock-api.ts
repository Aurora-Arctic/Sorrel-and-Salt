// The workshop's fake API: what a story's requests get back, answered in the browser by Mock
// Service Worker (MSW), so a real Save or Sign In button works without a server. Requests go to
// `/workshop/api/...` (claude-docs/workshop.md, "Notes the `.storybook/` files cite").

import { type TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type DocumentNode, getOperationAST } from 'graphql';
import { useLayoutEffect } from 'react';
import { graphql } from 'msw/graphql';
import { http, HttpResponse } from 'msw/http';
import { delay, type RequestHandler } from 'msw';
import type { SetupWorker } from 'msw/browser';
import { apiPath } from '@/lib/api-path';

/** The GraphQL endpoint as a story's requests reach it. */
const graphqlEndpoint = graphql.link(apiPath('/api/graphql'));

/** The error shape the server sends (src/graphql/errors.ts), as the client reads it. */
export type MockError = {
  message: string;
  /** `FORBIDDEN`, `VALIDATION`, `NOT_FOUND` and the server's other codes. */
  code?: string;
  /** Present on `VALIDATION`: which field, and what to say beside it. */
  fieldErrors?: readonly { path: readonly (string | number)[]; message: string }[];
  /** The GraphQL path of the failed field, as Yoga sends it (`['saveStock']`). */
  path?: readonly (string | number)[];
};

function operationName(document: DocumentNode): string {
  const name = getOperationAST(document)?.name?.value;
  if (!name) throw new Error('A mocked document needs a named operation, to be matched by name.');
  return name;
}

/** What a resolver returns to refuse the request, built by {@link refusal}. */
class Refusal {
  constructor(readonly error: MockError) {}
}

/** Refuses an operation as the server does: HTTP 200, no data, one error with its code. */
export function refusal(error: MockError): Refusal {
  return new Refusal(error);
}

type Resolver<Result, Variables> = (info: {
  variables: Variables;
}) => Result | Refusal | Promise<Result | Refusal>;

type Options = {
  /** A pause before the answer, so a story shows its saving or loading state. */
  delayMs?: number;
};

function body(result: unknown): object {
  if (!(result instanceof Refusal)) return { data: result };
  const { message, code, fieldErrors, path } = result.error;
  return {
    data: null,
    errors: [
      { message, ...(path && { path }), extensions: { code, ...(fieldErrors && { fieldErrors }) } },
    ],
  };
}

function answer<Result, Variables extends object>(
  kind: 'query' | 'mutation',
  document: TypedDocumentNode<Result, Variables>,
  resolver: Resolver<Result, Variables>,
  { delayMs }: Options,
): RequestHandler {
  return graphqlEndpoint[kind](operationName(document), async ({ variables }) => {
    if (delayMs) await delay(delayMs);
    return HttpResponse.json(body(await resolver({ variables: variables as Variables })));
  });
}

/** Answers a query by its name, typed by its generated document. */
export function answerQuery<Result, Variables extends object>(
  document: TypedDocumentNode<Result, Variables>,
  resolver: Resolver<Result, Variables>,
  options: Options = {},
): RequestHandler {
  return answer('query', document, resolver, options);
}

/** Answers a mutation by its name, typed by its generated document. */
export function answerMutation<Result, Variables extends object>(
  document: TypedDocumentNode<Result, Variables>,
  resolver: Resolver<Result, Variables>,
  options: Options = {},
): RequestHandler {
  return answer('mutation', document, resolver, options);
}

/**
 * Answers every operation from one function, for a story with many lookups. It returns a result,
 * a {@link refusal}, or undefined for an operation it has no answer to, which goes on to the next handler.
 */
export function answerOperations(
  resolver: (info: {
    operationName: string;
    variables: Record<string, unknown>;
  }) => object | Refusal | undefined | Promise<object | Refusal | undefined>,
  { delayFor }: { delayFor?: (operationName: string) => number } = {},
): RequestHandler {
  return graphqlEndpoint.operation(async ({ operationName, variables }) => {
    const result = await resolver({ operationName, variables });
    if (result === undefined) return undefined;
    const wait = delayFor?.(operationName);
    if (wait) await delay(wait);
    return HttpResponse.json(body(result));
  });
}

/** Never answers any query or mutation, for a story that shows every wait for good. */
export function hangAllOperations(): RequestHandler {
  return graphqlEndpoint.operation(() => delay('infinite'));
}

/** Never answers a query or mutation, for a story that shows its loading or saving state for good. */
export function hangOperation(
  kind: 'query' | 'mutation',
  document: TypedDocumentNode,
): RequestHandler {
  return graphqlEndpoint[kind](operationName(document), () => delay('infinite'));
}

/** Never answers a request to the sign-in service, for a story that shows its waiting state for good. */
export function hangAuth(): RequestHandler {
  return http.all(apiPath('/api/auth/*'), () => delay('infinite'));
}

/** Refuses a sign-in service call as for an unreachable account: HTTP 403, Better Auth's error shape. */
export function refuseAuth(message = 'The sign-in service refused the request'): RequestHandler {
  return http.post(apiPath('/api/auth/*'), () =>
    HttpResponse.json({ message }, { status: 403, statusText: 'Forbidden' }),
  );
}

/**
 * What every story starts with: a signed-out session, and a plain refusal for any other request,
 * so a story that needs an answer fails with its name in the console, not as a 404.
 */
export const defaultHandlers: RequestHandler[] = [
  http.get(apiPath('/api/auth/get-session'), () => HttpResponse.json(null)),
  http.all(apiPath('/api/*'), async ({ request }) => {
    let what = new URL(request.url).pathname;
    if (what.endsWith('/graphql')) {
      const { operationName: name } = (await request.clone().json()) as { operationName?: string };
      what = `${what} ${name ?? '(unnamed)'}`;
    }
    // eslint-disable-next-line no-console -- the one way a story's author learns a request had no mock
    console.warn(
      `The workshop has no mock for ${request.method} ${what}. Add one with msw.use() in the story's beforeEach.`,
    );
    return HttpResponse.json({ message: `No workshop mock for ${what}` }, { status: 501 });
  }),
];

let runningWorker: SetupWorker | undefined;
const mounted = new Set<readonly RequestHandler[]>();

/**
 * Answers while the calling component is mounted, for a state an arg or control picks, which
 * `beforeEach` cannot follow. Use it or `msw.use`, not both (claude-docs/workshop.md, "Notes the
 * `.storybook/` files cite"). Pass a list that keeps its identity.
 */
export function useMockHandlers(handlers: readonly RequestHandler[]): void {
  useLayoutEffect(() => {
    const worker = runningWorker;
    if (!worker) return;
    const apply = () => {
      worker.resetHandlers();
      worker.use(...[...mounted].flat().reverse());
    };
    mounted.add(handlers);
    apply();
    return () => {
      mounted.delete(handlers);
      apply();
    };
  }, [handlers]);
}

/**
 * Starts the worker for `mswLoader` (msw-storybook-addon/csf3). The worker file is looked up
 * beside the page (claude-docs/workshop.md, "Notes the `.storybook/` files cite").
 */
export async function startMockWorker(): Promise<SetupWorker> {
  const { setupWorker } = await import('msw/browser');
  const worker = setupWorker(...defaultHandlers);
  runningWorker = worker;
  await worker.start({
    quiet: true,
    serviceWorker: { url: './mockServiceWorker.js' },
    onUnhandledFrame: 'bypass',
  });
  return worker;
}
