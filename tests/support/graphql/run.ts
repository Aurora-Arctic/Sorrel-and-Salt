import { createYoga } from 'graphql-yoga';
import type { GraphQLSchema } from 'graphql';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Context } from '@/graphql/types';
import type { Session } from '@/lib/session';
import {
  noDocumentMailingNotifier,
  noInvitationSender,
  noPasswordSetter,
  noSender,
  noPauseNotifier,
  noSupportNotifier,
} from '../email-verification';
import type { Answer, ContextOverrides } from './types';

// A resolver test's one way in: the route's schema behind Yoga with the route's own `maskedErrors`, so a
// refusal is read as the browser reads it, by `extensions.code` (claude-docs/testing/layer-ownership.md,
// "The owning layer"). The context is built by hand, as the route's `createContext` reads a cookie.

function runnerOn(target: GraphQLSchema) {
  const yoga = createYoga<Context>({ schema: target, maskedErrors, logging: false });

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
      {
        session,
        loaders: createLoaders(session),
        emailVerification: noSender,
        invitations: noInvitationSender,
        passwords: noPasswordSetter,
        support: noSupportNotifier,
        pauses: noPauseNotifier,
        documents: noDocumentMailingNotifier,
        ...context,
      },
    );
    return (await response.json()) as Answer<T>;
  };
}

export const run = runnerOn(schema);
