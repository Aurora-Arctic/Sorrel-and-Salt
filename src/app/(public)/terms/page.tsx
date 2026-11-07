import type { Metadata } from 'next';
import { SITE_NAME, siteUrl } from '../../../lib/site';
import { currentDocumentPage } from '../_documents';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: `The rules of ${SITE_NAME}: who may use it, what is yours, what the site promises and what it does not.`,
  alternates: { canonical: siteUrl('/terms') },
};

// Read from the database per request, so the page is never frozen at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('terms');
}
