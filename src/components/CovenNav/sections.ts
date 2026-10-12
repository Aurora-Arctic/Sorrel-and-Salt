import type { Route } from 'next';
import type { CovenSection } from './types';

// `Route<T>` checks a dynamic address against the built routes only when `T`
// is inferred from the address itself, as `<Link href>` infers it; a field
// typed plain `Route` refuses every template literal, so the production build
// fails where `tsc` against the dev server's types passes. Each address goes
// through `route()`, which keeps the check, rather than an `as Route` cast,
// which would let a link to an unbuilt page through.
const route = <T extends string>(href: Route<T>): Route => href as Route;

// The coven's sections, in order: the one list the nav reads
// (claude-docs/components/coven-nav.md). A later task adds its row in its own
// PR, the one that builds the page, since `typedRoutes` refuses a link to a
// route the build does not contain: Members (M6.13), Ingredients (M9.6),
// Grimoire (M10.11).
export const covenSections = (slug: string): readonly CovenSection[] => [
  { label: 'Overview', href: route(`/coven/${slug}`), exact: true },
];
