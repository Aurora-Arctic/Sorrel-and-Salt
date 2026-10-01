import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';
import type { Plugin } from 'graphql-yoga';

/** Field levels a query may nest, `{ ok }` being one (DESIGN.md §7). */
export const MAX_DEPTH = 7;

/**
 * The limits on what a client may ask. Depth, aliases, directives and tokens
 * hold everywhere; cost is the complexity plugin's, priced after variables are
 * bound, which armor's check is not. Introspection and field suggestions are off
 * wherever `production` holds, which is every deploy, staging included, and
 * a local production build too (claude-docs/graphql/protections.md, "Protections").
 */
export function protections({
  production,
}: {
  production: boolean;
}): Plugin<Record<string, unknown>>[] {
  return [
    EnvelopArmorPlugin({
      maxDepth: { n: MAX_DEPTH },
      costLimit: { enabled: false },
      blockFieldSuggestion: { enabled: production },
    }),
    ...(production ? [useDisableIntrospection()] : []),
  ];
}
