import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SITE_NAME } from '@/lib/site';
import { currentDocumentPage } from '../_documents';

export const metadata: Metadata = publicPageMetadata(
  'Disclaimer',
  `${SITE_NAME} is folklore and reference, not medical or professional advice, and its safety notes do not list every risk.`,
  '/disclaimer',
);

// Read from the database per request, so the page is never frozen at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('disclaimer');
}
