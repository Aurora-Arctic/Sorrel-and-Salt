import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SITE_NAME } from '@/lib/site';
import { currentDocumentPage } from '../_documents';
import { PRIVACY_PLACEHOLDERS } from './placeholders';

export const metadata: Metadata = publicPageMetadata(
  'Privacy Policy',
  `What personal data ${SITE_NAME} keeps, who processes it, how long it is kept and who can see it.`,
  '/privacy',
);

// Read from the database per request, so the page is never frozen at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('privacy', PRIVACY_PLACEHOLDERS);
}
