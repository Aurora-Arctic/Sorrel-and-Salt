import type { PageNavEntry } from '@/components/PageNav/types';

import { ACCOUNT_INVITATIONS_ID } from '@/lib/sign-in';

// The "On This Page" menus of the two account tabs, written once for a page and its skeleton.

export const ACCOUNT_NAV: PageNavEntry[] = [
  { href: '#account-name', label: 'Name' },
  { href: '#account-email', label: 'Email' },
  { href: `#${ACCOUNT_INVITATIONS_ID}`, label: 'Invitations' },
];

export const SIGN_IN_NAV: PageNavEntry[] = [
  { href: '#sign-in-methods', label: 'Sign-In Methods' },
  { href: '#password', label: 'Password' },
  { href: '#two-factor', label: 'Two-Factor Sign-In' },
  { href: '#passkeys', label: 'Passkeys' },
];
