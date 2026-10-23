// The workshop's fake API: what a story's requests to the app's own endpoints
// get back, answered in the browser by Mock Service Worker (MSW), so a real
// Save or Sign In button works without a server.
//
// The app's clients ask for `/workshop/api/...` here, not `/api/...`
// (`WORKSHOP_API_PREFIX`, set in main.ts; src/lib/api-path.ts), because
// staging's Content Security Policy lets a workshop page reach only addresses
// under /workshop/, and it refuses the real ones before a service worker can
// answer. claude-docs/workshop.md, "On staging".
//
// A story says what its requests get with `beforeEach`:
//
//   beforeEach: ({ msw }) => msw.use(answerMutation(SaveIngredientDocument, () => ({ ... })))
//
// The handlers set here are the defaults every story starts from; the
// addon puts the worker back to them after each story.

import { type TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type DocumentNode, getOperationAST } from 'graphql';
import { delay, graphql, http, HttpResponse, type RequestHandler } from 'msw';
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
  /** Where in the request's variables the refusal is, for a batch. */
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

/**
 * What every story starts with: a signed-out session, and a plain refusal for
 * any other request to the app's endpoints, so a story that needs an answer
 * fails with its name in the console, not as an unexplained 404.
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

/**
 * Starts the worker for `mswLoader` (msw-storybook-addon/csf3). The worker file
 * is looked up beside the page, `./mockServiceWorker.js`, so it is found under
 * /workshop/ on staging as well as at the root of the dev server; the addon's
 * own default is the root alone. Requests nothing handles (the page's own
 * files) go to the network as they would.
 */
export async function startMockWorker(): Promise<SetupWorker> {
  const { setupWorker } = await import('msw/browser');
  const worker = setupWorker(...defaultHandlers);
  await worker.start({
    quiet: true,
    serviceWorker: { url: './mockServiceWorker.js' },
    onUnhandledRequest: 'bypass',
  });
  return worker;
}
