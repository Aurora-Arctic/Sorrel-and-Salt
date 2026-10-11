import type { AdminPage, AdminSection } from './types';

// Every admin page, its tabs and its section: the one list the nav, the
// `/admin` index and each tabbed page's layout read, so the three cannot
// drift (MB.115; claude-docs/components/admin-nav.md). A list shares its page
// with the group list that organises it, a tab each, as Category Groups
// organise Categories (M5.6b, MB.132), on the owner's call after the design
// review. Each href is checked against the built routes (typedRoutes).
export const ADMIN_PAGES = {
  compendium: {
    label: 'Compendium',
    description: 'Every ingredient in the shared reference, with its forms and sources.',
    tabs: [{ href: '/admin/compendium', label: 'Compendium' }],
  },
  categories: {
    label: 'Categories',
    description: 'The categories an ingredient is filed under, and the groups that colour them.',
    tabs: [
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/category-groups', label: 'Groups' },
    ],
  },
  forms: {
    label: 'Forms',
    description:
      'The forms an ingredient comes in, and the groups that tell two forms of one name apart.',
    tabs: [
      { href: '/admin/forms', label: 'Forms' },
      { href: '/admin/form-groups', label: 'Groups' },
    ],
  },
  deities: {
    label: 'Deities',
    description: 'The deities an ingredient can be linked with, and the traditions they belong to.',
    tabs: [
      { href: '/admin/deities', label: 'Deities' },
      { href: '/admin/deity-traditions', label: 'Traditions' },
    ],
  },
  astrology: {
    label: 'Astrology',
    description: 'The planets and zodiac signs an ingredient can be linked with.',
    tabs: [
      { href: '/admin/planets', label: 'Planets' },
      { href: '/admin/zodiac-signs', label: 'Zodiac Signs' },
    ],
  },
  people: {
    label: 'People',
    description:
      'Every account and its role, the admin invitations waiting, and who changed which privilege.',
    tabs: [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/invitations', label: 'Invitations' },
      // Who holds which privilege, and who changed it (MB.200).
      { href: '/admin/privilege-changes', label: 'Privilege Changes' },
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
  { name: 'People', pages: [ADMIN_PAGES.people] },
];
