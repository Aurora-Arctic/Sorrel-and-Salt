import { KINDS as VALUE_KINDS } from '../GroupedValueList/kinds';
import { KINDS as GROUP_KINDS } from '../GroupList/kinds';
import { capitalise } from '../../lib/text';
import type { GroupKind } from '../GroupForm/types';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import type { PageTab } from '../TabbedPage/types';
import type { AdminPage, AdminSection } from './types';

/** A curated list's tab, at its kind's address and under its title: it opens with a filter. */
const valueTab = (kind: GroupedValueKind): PageTab => ({
  href: VALUE_KINDS[kind].path,
  label: VALUE_KINDS[kind].title,
  filtered: true,
});

/** A group list's tab, "Groups" or "Traditions": it opens with no filter. */
const groupTab = (kind: GroupKind): PageTab => ({
  href: GROUP_KINDS[kind].path,
  label: capitalise(GROUP_KINDS[kind].plural),
});

// Every admin page, its tabs and section: the one list the nav, the `/admin` index and each tabbed layout
// read. A vocabulary's tab is built from its kind table (`GroupList/kinds.ts`, `GroupedValueList/kinds.ts`);
// the others are checked against built routes (typedRoutes). A `filtered` tab's loading skeleton draws a filter.
export const ADMIN_PAGES = {
  compendium: {
    label: 'Compendium',
    icon: 'compendium',
    description: 'Every ingredient in the shared reference, with its forms and sources.',
    tabs: [{ href: '/admin/compendium', label: 'Compendium' }],
  },
  categories: {
    label: 'Categories',
    icon: 'categories',
    description: 'The categories an ingredient is filed under, and the groups that colour them.',
    tabs: [valueTab('category'), groupTab('category')],
  },
  forms: {
    label: 'Forms',
    icon: 'forms',
    description:
      'The forms an ingredient comes in, and the groups that tell two forms of one name apart.',
    tabs: [valueTab('form'), groupTab('form')],
  },
  deities: {
    label: 'Deities',
    icon: 'deities',
    description: 'The deities an ingredient can be linked with, and the traditions they belong to.',
    tabs: [valueTab('deity'), groupTab('tradition')],
  },
  astrology: {
    label: 'Astrology',
    icon: 'astrology',
    description: 'The celestial bodies and zodiac signs an ingredient can be linked with.',
    tabs: [valueTab('celestialBody'), valueTab('zodiacSign')],
  },
  people: {
    label: 'People',
    icon: 'people',
    description:
      'Every account and its role, the admin invitations waiting, and who changed which privilege.',
    tabs: [
      { href: '/admin/users', label: 'Users', filtered: true },
      { href: '/admin/invitations', label: 'Invitations' },
      // Printed cards that admit one account each, and who arrived by them.
      { href: '/admin/invitation-cards', label: 'Invitation Cards' },
      { href: '/admin/card-sign-ups', label: 'Card Sign-Ups' },
      // Who holds which privilege, and who changed it.
      { href: '/admin/privilege-changes', label: 'Privilege Changes', filtered: true },
    ],
  },
} as const satisfies Record<string, AdminPage>;

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    name: 'Compendium',
    pages: [
      ADMIN_PAGES.compendium,
      ADMIN_PAGES.categories,
      ADMIN_PAGES.forms,
      ADMIN_PAGES.deities,
      ADMIN_PAGES.astrology,
    ],
  },
  { name: 'People', pages: [ADMIN_PAGES.people], adminOnly: true },
];

/**
 * The sections a viewer is shown: every one to an admin, and a curator all but
 * People. Only what the nav lists; each people page refuses a curator itself
 * (claude-docs/auth/admin-guard.md, "The curator guard").
 */
export const adminSections = (managesPeople: boolean): readonly AdminSection[] =>
  ADMIN_SECTIONS.filter(({ adminOnly }) => managesPeople || !adminOnly);
