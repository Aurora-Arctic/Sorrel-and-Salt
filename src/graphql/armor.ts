import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';
import type { Plugin } from 'graphql-yoga';

/** Field levels a query may nest, `{ ok }` being one (DESIGN.md §7). */
export const MAX_DEPTH = 7;

/**
 * graphql-armor's cost units: 2 an object field, 1 a scalar, ×1.5 each level
 * down, × a literal `first`/`last`. Pinned rather than left to the package's
 * default, which is the same number today, so an upgrade cannot move it.
 */
export const MAX_COST = 5000;

/**
 * The limits on what a client may ask. Depth, cost, aliases, directives and
 * tokens hold everywhere. Introspection and field suggestions are off
 * wherever `production` holds, which is every deploy, staging included, and
 * a local production build too (claude-docs/graphql.md, "Protections").
 */
export function protections({
  production,
}: {
  production: boolean;
}): Plugin<Record<string, unknown>>[] {
  return [
    EnvelopArmorPlugin({
      maxDepth: { n: MAX_DEPTH },
      costLimit: { maxCost: MAX_COST },
      blockFieldSuggestion: { enabled: production },
    }),
    ...(production ? [useDisableIntrospection()] : []),
  ];
}
