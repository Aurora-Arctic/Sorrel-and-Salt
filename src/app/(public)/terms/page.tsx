import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SITE_NAME } from '../../../lib/site';
import { currentDocumentPage } from '../_documents';

export const metadata: Metadata = publicPageMetadata(
  'Terms of Use',
  `The rules of ${SITE_NAME}: who may use it, what is yours, what the site promises and what it does not.`,
  '/terms',
);

// Read from the database per request, so the page is never frozen at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('terms');
}
