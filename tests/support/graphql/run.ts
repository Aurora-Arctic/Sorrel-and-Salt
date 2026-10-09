import { createYoga } from 'graphql-yoga';
import type { GraphQLSchema } from 'graphql';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Context } from '@/graphql/types';
import type { Session } from '@/lib/session';
import { noSender } from '../email-verification';
import type { Answer, ContextOverrides } from './types';

// A resolver test's one way in (MB.185): the route's schema behind Yoga with
// the route's own `maskedErrors`, so a refusal is read as the browser reads it,
// `extensions.code`, and never as the thrown type, which the wire does not
// carry. Bare `graphql()` would hand a test `originalError`, the service's own
// observation and a second copy of its test (claude-docs/testing/layer-ownership.md,
// "The owning layer"). The context is built by hand rather than by the route's
// `createContext`, which reads the session off a cookie.

/**
 * A runner over `target` behind the route's `maskedErrors`. Only
 * tests/modules/coven/services/two-transports.test.ts builds one over a schema
 * of its own (MB.186), for a field no production schema has; every other test
 * uses `run`.
 */
export function runnerOn(target: GraphQLSchema) {
  const yoga = createYoga<Context>({ schema: target, maskedErrors, logging: false });

  /**
   * Runs one operation as `session`, with a fresh set of loaders and a sender
   * that sends nothing, as one request would. A test hands in `context` for
   * loaders it watches or shares between operations — a loader's cache read
   * either side of a write — or a sender that records what it was asked to mail.
   */
  return async function run<T = Record<string, unknown>>(
    session: Session | null,
    query: string,
    variables: Record<string, unknown> = {},
    context: ContextOverrides = {},
  ): Promise<Answer<T>> {
    const response = await yoga.fetch(
      'http://localhost/graphql',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      },
      { session, loaders: createLoaders(session), emailVerification: noSender, ...context },
    );
    return (await response.json()) as Answer<T>;
  };
}

/** Runs one operation against the route's schema; `runnerOn` says what `context` is for. */
export const run = runnerOn(schema);
