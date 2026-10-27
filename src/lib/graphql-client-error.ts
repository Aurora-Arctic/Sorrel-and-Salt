import type { GraphQLFormattedError } from 'graphql';

// Its own file, apart from the client, because the form readers in
// graphql-failure.ts test for it with `instanceof`, and a component test that
// replaces `@/lib/graphql-client` with a stub must not take the class with it.

/**
 * A request that got an answer but not a whole one: a non-2xx status, GraphQL
 * `errors`, or no `data`. `status` is the HTTP status, which `shouldRetry`
 * reads; `errors` is the response's own list, which the form readers in
 * graphql-failure.ts open. claude-docs/graphql/client.md, "A GraphQL error rejects".
 */
export class GraphQLClientError extends Error {
  readonly status: number;
  readonly errors: readonly GraphQLFormattedError[] | undefined;

  constructor({
    status,
    errors,
  }: {
    status: number;
    errors: readonly GraphQLFormattedError[] | undefined;
  }) {
    super(errors?.[0]?.message ?? `GraphQL request failed with status ${status}`);
    this.name = 'GraphQLClientError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * A STALE_WRITE answer: the save named a revision the row has moved past,
 * and `currentRevision` is the one it holds now (M13.16). A
 * `GraphQLClientError` still, so everything reading one reads this; the
 * autosave hook tells it apart to pause and offer a choice instead of
 * retrying. claude-docs/components/autosave.md, "The server's half".
 */
export class StaleWriteError extends GraphQLClientError {
  readonly currentRevision: number;

  constructor({
    status,
    errors,
    currentRevision,
  }: {
    status: number;
    errors: readonly GraphQLFormattedError[] | undefined;
    currentRevision: number;
  }) {
    super({ status, errors });
    this.name = 'StaleWriteError';
    this.currentRevision = currentRevision;
  }
}
