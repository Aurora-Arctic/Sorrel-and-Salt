import type { Route } from 'next';
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

// Every admin page, its tabs and section: the one list the two navs, the two indexes and each tabbed layout
// read. A vocabulary's tab is built from its kind table (`GroupList/kinds.ts`, `GroupedValueList/kinds.ts`);
// the others are checked against built routes (typedRoutes). A `filtered` tab's loading skeleton draws a filter.
export const ADMIN_PAGES = {
  compendium: {
    label: 'Compendium',
    icon: 'compendium',
    description: 'Every ingredient in the shared reference, with its forms and sources.',
    tabs: [{ href: '/curator/compendium', label: 'Compendium' }],
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
    adminOnly: true,
    description: 'Every account and its role, and who changed which privilege.',
    tabs: [
      { href: '/keepers/users', label: 'Users', filtered: true },
      // Who holds which privilege, and who changed it.
      { href: '/keepers/privilege-changes', label: 'Privilege Changes', filtered: true },
    ],
  },
  invitations: {
    label: 'Invitations',
    icon: 'people',
    adminOnly: true,
    description:
      'The admin invitations waiting, the printed invitation cards, and who arrived by them.',
    tabs: [
      { href: '/keepers/invitations', label: 'Invitations' },
      // Printed cards that admit one account each, and who arrived by them.
      { href: '/keepers/invitation-cards', label: 'Invitation Cards' },
      { href: '/keepers/card-sign-ups', label: 'Card Sign-Ups' },
    ],
  },
  support: {
    label: 'Support',
    icon: 'support',
    description: 'The help requests people have sent, with replies, assignment and time-outs.',
    tabs: [{ href: '/keepers/support', label: 'Support' }],
  },
  documents: {
    label: 'Documents',
    icon: 'documents',
    adminOnly: true,
    description:
      'The privacy policy, disclaimer, code of ethics and terms of use: edit a draft, then publish it as a new version.',
    // One tab per document, in the footer's order; each is that document's editor. The cast is because typed routes know the address only as `[key]`.
    tabs: [
      { href: '/keepers/documents/privacy' as Route, label: 'Privacy Policy', shape: 'document' },
      { href: '/keepers/documents/disclaimer' as Route, label: 'Disclaimer', shape: 'document' },
      { href: '/keepers/documents/terms' as Route, label: 'Terms of Use', shape: 'document' },
      {
        href: '/keepers/documents/code-of-ethics' as Route,
        label: 'Code of Ethics',
        shape: 'document',
      },
    ],
  },
} as const satisfies Record<string, AdminPage>;

/** The `/curator` area: the curation pages, for a curator and an admin alike. */
export const CURATOR_SECTIONS: readonly AdminSection[] = [
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
];

/** The `/keepers` area: the people, invitation and document pages, which are an admin's, and Support, which a curator has too. */
export const KEEPERS_SECTIONS: readonly AdminSection[] = [
  {
    name: 'People & Support',
    pages: [
      ADMIN_PAGES.people,
      ADMIN_PAGES.invitations,
      ADMIN_PAGES.support,
      ADMIN_PAGES.documents,
    ],
  },
];

/**
 * The Keepers sections a viewer is shown: every page to an admin, and a curator Support alone. Only what the
 * nav lists; each people and invitation page refuses a curator itself (claude-docs/auth/admin-guard.md,
 * "The curator guard").
 */
export const adminSections = (managesPeople: boolean): readonly AdminSection[] =>
  KEEPERS_SECTIONS.map((section) => ({
    ...section,
    pages: section.pages.filter(({ adminOnly }) => managesPeople || !adminOnly),
  })).filter(({ pages }) => pages.length > 0);
