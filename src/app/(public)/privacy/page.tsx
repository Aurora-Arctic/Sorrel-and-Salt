import type { Metadata } from 'next';
import { SITE_NAME, siteUrl } from '../../../lib/site';
import { currentDocumentPage } from '../_documents';
import { PRIVACY_PLACEHOLDERS } from './placeholders';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `What personal data ${SITE_NAME} keeps, who processes it, how long it is kept and who can see it.`,
  alternates: { canonical: siteUrl('/privacy') },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('privacy', PRIVACY_PLACEHOLDERS);
}
