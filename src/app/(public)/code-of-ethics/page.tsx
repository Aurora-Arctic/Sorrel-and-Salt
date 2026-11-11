import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SITE_NAME } from '@/lib/site';
import { currentDocumentPage } from '../_documents';

export const metadata: Metadata = publicPageMetadata(
  'Code of Ethics',
  `What ${SITE_NAME} values, and how it handles the cultures, sourcing and access questions its subject raises.`,
  '/code-of-ethics',
);

// Read from the database per request, so the page is never frozen at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('code-of-ethics');
}
