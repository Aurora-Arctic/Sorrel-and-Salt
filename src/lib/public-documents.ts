import type { PublicDocumentLink } from '@/lib/types';

/** The site's public documents, About included: the one list the sitemap and llms.txt both read. */
export const PUBLIC_DOCUMENTS: readonly PublicDocumentLink[] = [
  { path: '/privacy', title: 'Privacy Policy' },
  { path: '/disclaimer', title: 'Disclaimer' },
  { path: '/about', title: 'About Us' },
  { path: '/terms', title: 'Terms of Use' },
  { path: '/code-of-ethics', title: 'Code of Ethics' },
];
