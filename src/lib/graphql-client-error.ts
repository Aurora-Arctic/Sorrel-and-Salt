import type { GraphQLFormattedError } from 'graphql';

// Its own file, apart from the client, because the form readers in
// graphql-failure.ts test for it with `instanceof`, and a component test that
// replaces `@/lib/graphql-client` with a stub must not take the class with it.

/**
 * A request that got an answer but not a whole one: a non-2xx status, GraphQL `errors`, or no `data`. `status` is read by `shouldRetry`, `errors` by
 * the form readers in graphql-failure.ts (claude-docs/graphql/client.md, "A GraphQL error rejects").
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
 * A STALE_WRITE answer: the save named a revision the row has moved past; `currentRevision` is the one it holds now. Still a `GraphQLClientError`, which
 * the autosave hook tells apart to pause and offer a choice (claude-docs/components/autosave.md, "The server's half").
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
