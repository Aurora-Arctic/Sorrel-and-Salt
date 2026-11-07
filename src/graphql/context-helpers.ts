import type { ObjectRef } from '@pothos/core';
import { AccessPaused, Forbidden } from '../lib/errors';
import { ACCESS_PAUSED_MESSAGE } from '../lib/access-paused';
import type { Session } from '../lib/session';
import { builder } from './builder';
import type { BuilderTypes, Context, Defined, Suggest } from './types';

// What a resolver adds to the service it calls (claude-docs/graphql/schema.md, "Resolver helpers"); none of
// it decides who may.

/**
 * The request's session, or `Forbidden` for a signed-out caller and `AccessPaused` for a paused one. A narrowing for the
 * type, not a gate. `.oxlintrc.json` refuses the inline copy in a resolver.
 */
export function sessionOf({
  session,
  accessPause,
}: Pick<Context, 'session' | 'accessPause'>): Session {
  if (accessPause) throw new AccessPaused(accessPause.until, ACCESS_PAUSED_MESSAGE);
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
