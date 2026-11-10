import type { Route } from 'next';
import type { SectionNavItem } from '../SectionNav/types';

// `Route<T>` checks a dynamic address against the built routes only when `T` is inferred from the
// address, as `<Link href>` does; a field typed plain `Route` refuses every template literal and fails
// the production build. Each address goes through `route()`, which keeps the check an `as Route` would lose.
const route = <T extends string>(href: Route<T>): Route => href as Route;

// The coven's sections, in order: the one list the nav reads (claude-docs/components/coven-nav.md).
// Members is shown by what the role may do (`member: read`), passed as a boolean since the server-only
// access-control module cannot load in the workshop's browser build; never by a rank.
export const covenSections = (slug: string, canReadMembers: boolean): readonly SectionNavItem[] =>
  sectionsOf(slug, canReadMembers);

const sectionsOf = (slug: string, canReadMembers: boolean): readonly SectionNavItem[] => [
  { label: 'Overview', href: route(`/coven/${slug}`), icon: 'overview', exact: true },
  { label: 'Ingredients', href: route(`/coven/${slug}/ingredients`), icon: 'ingredients' },
  { label: 'Grimoire', href: route(`/coven/${slug}/grimoire`), icon: 'grimoire' },
  ...(canReadMembers
    ? [
        {
          label: 'Members',
          href: route(`/coven/${slug}/members`),
          matches: [route(`/coven/${slug}/invitations`)],
          icon: 'members',
          apart: true,
        } as const,
      ]
    : []),
];
