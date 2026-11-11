import type { SectionNavItem } from '../SectionNav/types';
import { covenPath } from '@/lib/coven-path';

// The coven's sections, in order: the one list the nav reads (claude-docs/components/coven-nav.md).
// Members is shown by what the role may do (`member: read`), passed as a boolean since the server-only
// access-control module cannot load in the workshop's browser build; never by a rank.
export const covenSections = (slug: string, canReadMembers: boolean): readonly SectionNavItem[] => [
  { label: 'Overview', href: covenPath(slug), icon: 'overview', exact: true },
  { label: 'Ingredients', href: covenPath(slug, 'ingredients'), icon: 'ingredients' },
  { label: 'Grimoire', href: covenPath(slug, 'grimoire'), icon: 'grimoire' },
  ...(canReadMembers
    ? [
        {
          label: 'Members',
          href: covenPath(slug, 'members'),
          matches: [covenPath(slug, 'invitations')],
          icon: 'members',
          apart: true,
        } as const,
      ]
    : []),
];
