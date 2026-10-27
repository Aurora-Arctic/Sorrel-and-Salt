import type { Route } from 'next';
import { covenTarget } from '../../lib/coven-path';
import type { SectionNavItem } from '../SectionNav/types';

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
// route the build does not contain. Grimoire (M10.11) is current on its Drafts tab too,
// which lies beneath it. Members (M6.13) is shown by what the caller's role
// may do (`member: read`), which the layout asks of the service and passes
// in as a boolean: this file loads in the workshop's browser build, where the
// server-only access-control module cannot. Never by a rank, so a viewer is not offered a page
// that answers them with a 404.
export const covenSections = (slug: string, canReadMembers: boolean): readonly SectionNavItem[] =>
  sectionsOf(slug, canReadMembers).map((section) => ({
    ...section,
    // The coven's body draws the wait (M12.33), as the page it is going to.
    target: covenTarget(section.href),
  }));

const sectionsOf = (slug: string, canReadMembers: boolean): readonly SectionNavItem[] => [
  { label: 'Overview', href: route(`/coven/${slug}`), icon: 'overview', exact: true },
  { label: 'Ingredients', href: route(`/coven/${slug}/ingredients`), icon: 'ingredients' },
  { label: 'Grimoire', href: route(`/coven/${slug}/grimoire`), icon: 'grimoire' },
  ...(canReadMembers
    ? [
        {
          label: 'Members',
          href: route(`/coven/${slug}/members`),
          // Its Invitations tab belongs to the same section.
          matches: [route(`/coven/${slug}/invitations`)],
          icon: 'members',
          // Its own group, as People is in the admin nav: the coven's people, not its contents.
          apart: true,
        } as const,
      ]
    : []),
];
