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
 * The request's session, non-null, or `Forbidden` for a signed-out caller —
 * the refusal a field scope would have given, so the transport maps one
 * shape. A narrowing for the type, not a gate: a scoped field has refused a
 * null session already, and the service behind every field checks again.
 * `.oxlintrc.json` refuses the inline copy in a module's resolvers.
 */
export function sessionOf({ session }: Pick<Context, 'session'>): Session {
  if (!session) throw new Forbidden();
  return session;
}

/**
 * The arguments as a service takes them: each null, which GraphQL sends for
 * an optional argument or input field, made absent. Pass the fields named
 * rather than a connection's whole `args`, which also carry `first` and the
 * cursors, so a filter never grows keys its service would read or cache by.
 */
export function definedArgs<T extends object>(args: T): Defined<T> {
  return Object.fromEntries(
    Object.entries(args).map(([name, value]) => [name, value ?? undefined]),
  ) as Defined<T>;
}

/**
 * A picker's suggestion field: a page of `type` matching `query` across the
 * compendium and, when `workspaceId` names one, a coven the caller may read.
 * The resolver refuses only a missing session; which covens a caller may ask
 * about is `suggest`'s check.
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
        // Null reads the compendium alone: the admin's compendium form names no coven (M5.5).
        workspaceId: t.arg.id({ required: false }),
        query: t.arg.string({ required: false }),
      },
      resolve: (_root, { workspaceId, query }, page, context) =>
        suggest(sessionOf(context), workspaceId, query ?? '', page),
    }),
  );
}
