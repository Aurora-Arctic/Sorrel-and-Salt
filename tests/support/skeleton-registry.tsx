import type { ReactElement } from 'react';

// A stand-in for src/app/skeletons.ts in a component test: one entry per host and case the
// skeleton hosts tell apart, each skeleton a named region, so a test finds which one was drawn
// by role and name alone. A test mocks `@/app/skeletons` with `{ skeletons: testSkeletons }`.

const named = (name: string) => (): ReactElement => <section aria-label={name} />;

export const testSkeletons = {
  '/compendium': { host: 'main', Skeleton: named('Compendium skeleton') },
  '/coven': { host: 'main', Skeleton: named('Covens skeleton') },
  '/coven/[slug]': { host: 'coven', Skeleton: named('Coven home skeleton') },
  '/coven/[slug]/ingredients': { host: 'coven', Skeleton: named('Ingredients skeleton') },
  '/curator/categories': { host: 'admin', Skeleton: named('Categories skeleton') },
  '/curator/forms': { host: 'admin', Skeleton: named('Forms skeleton') },
  '/keepers/users': { host: 'admin', Skeleton: named('Users skeleton') },
  '/help': { host: 'help', Skeleton: named('Help index skeleton') },
  '/help/search': { host: 'help', Skeleton: named('Help search skeleton') },
} as const;
