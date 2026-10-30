import type { ObjectRef } from '@pothos/core';
import { Forbidden } from '../lib/errors';
import type { Session } from '../lib/session';
import { builder } from './builder';
import type { BuilderTypes, Context, Defined, Suggest } from './types';

// What a resolver adds to the service it calls, written once: the session as
// the service's type takes it, GraphQL's null as the service's absent, and the
// one suggestion field six pickers read (claude-docs/graphql/schema.md,
// "Resolver helpers"). None of it decides who may: that is the service's.

/**
 * The request's session, or `Forbidden` for a signed-out caller. A narrowing for the type, not a gate.
 * `.oxlintrc.json` refuses the inline copy in a resolver.
 */
export function sessionOf({ session }: Pick<Context, 'session'>): Session {
  if (!session) throw new Forbidden();
  return session;
}

/**
 * The arguments as a service takes them: each null made absent. Pass the fields named,
 * not a connection's whole `args`, so a filter never grows keys the service would read.
 */
export function definedArgs<T extends object>(args: T): Defined<T> {
  return Object.fromEntries(
    Object.entries(args).map(([name, value]) => [name, value ?? undefined]),
  ) as Defined<T>;
}

/**
 * A picker's suggestion field: a page of `type` matching `query` across the compendium and, with `workspaceId`,
 * a coven the caller may read. The resolver refuses only a missing session; `suggest` checks the coven.
 */
export function suggestionConnection<Node>(
  name: string,
  type: ObjectRef<BuilderTypes, Node>,
  suggest: Suggest<Node>,
): void {
  builder.queryField(name, (t) =>
    t.pagedConnection({
      type,
      args: {
        // Null reads the compendium alone: the admin's compendium form names no coven.
        workspaceId: t.arg.id({ required: false }),
        query: t.arg.string({ required: false }),
      },
      resolve: (_root, { workspaceId, query }, page, context) =>
        suggest(sessionOf(context), workspaceId, query ?? '', page),
    }),
  );
}
