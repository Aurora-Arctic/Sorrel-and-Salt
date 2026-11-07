import type { Metadata } from 'next';
import { SITE_NAME, siteUrl } from '../../../lib/site';
import { currentDocumentPage } from '../_documents';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: `${SITE_NAME} is folklore and reference, not medical or professional advice, and its safety notes do not list every risk.`,
  alternates: { canonical: siteUrl('/disclaimer') },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('disclaimer');
}
