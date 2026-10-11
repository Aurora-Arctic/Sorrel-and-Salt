import type { AdminSection } from './types';

// Every admin page, in its groups: the one list both the nav and the `/admin`
// index read, so the two cannot drift (MB.115; claude-docs/components/admin-nav.md).
// A list sits with the group list that organises it, as Category Groups
// organise Categories (M5.6b, MB.132). Each href is checked against the
// built routes (typedRoutes).
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    name: 'Compendium',
    pages: [
      {
        href: '/admin/compendium',
        label: 'Compendium',
        description: 'Every ingredient in the shared reference, with its forms and sources.',
      },
    ],
  },
  {
    name: 'Categories',
    pages: [
      {
        href: '/admin/categories',
        label: 'Categories',
        description: 'The categories an ingredient is filed under, each in a group.',
      },
      {
        href: '/admin/category-groups',
        label: 'Category Groups',
        description: 'The groups categories sit in, and the colours each is drawn in.',
      },
    ],
  },
  {
    name: 'Forms',
    pages: [
      {
        href: '/admin/forms',
        label: 'Forms',
        description: 'The forms an ingredient comes in, offered as you type a form.',
      },
      {
        href: '/admin/form-groups',
        label: 'Form Groups',
        description: 'The groups forms sit in, which tell two forms of one name apart.',
      },
    ],
  },
  {
    name: 'Deities',
    pages: [
      {
        href: '/admin/deities',
        label: 'Deities',
        description: 'The deities an ingredient can be linked with, each in a tradition.',
      },
      {
        href: '/admin/deity-traditions',
        label: 'Deity Traditions',
        description: 'The traditions deities are grouped by.',
      },
    ],
  },
  {
    name: 'Astrology',
    pages: [
      {
        href: '/admin/planets',
        label: 'Planets',
        description: 'The planets an ingredient can be linked with.',
      },
      {
        href: '/admin/zodiac-signs',
        label: 'Zodiac Signs',
        description: 'The signs an ingredient can be linked with.',
      },
    ],
  },
  {
    name: 'People',
    pages: [
      {
        href: '/admin/users',
        label: 'Users',
        description: 'Every account: its role, whether it can create a coven, and its invitations.',
      },
      // Who holds which privilege, and who changed it (MB.200).
      {
        href: '/admin/privilege-changes',
        label: 'Privilege Changes',
        description: 'Who granted or revoked which privilege, and when.',
      },
    ],
  },
];
