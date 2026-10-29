import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';
import type { Plugin } from 'graphql-yoga';

/** Field levels a query may nest, `{ ok }` being one (DESIGN.md §7). */
export const MAX_DEPTH = 7;

/**
 * The limits on what a client may ask. Cost is the complexity plugin's; the rest hold everywhere.
 * Introspection and suggestions are off wherever `production` holds (claude-docs/graphql/protections.md).
 */
export function protections({
  production,
}: {
  production: boolean;
}): Plugin<Record<string, unknown>>[] {
  // graphql-armor is typed against @envelop/types 5; graphql-yoga 6 carries
  // @envelop/types 6, whose hook payloads differ only in type. The plugin is the
  // same at runtime, so it is cast here, at the one boundary.
  const armor = EnvelopArmorPlugin({
    maxDepth: { n: MAX_DEPTH },
    costLimit: { enabled: false },
    blockFieldSuggestion: { enabled: production },
  }) as unknown as Plugin<Record<string, unknown>>;
  return [armor, ...(production ? [useDisableIntrospection()] : [])];
}
