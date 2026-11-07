import type { Metadata } from 'next';
import { SITE_NAME, siteUrl } from '../../../lib/site';
import { currentDocumentPage } from '../_documents';

export const metadata: Metadata = {
  title: 'Code of Ethics',
  description: `What ${SITE_NAME} values, and how it handles the cultures, sourcing and access questions its subject raises.`,
  alternates: { canonical: siteUrl('/code-of-ethics') },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return currentDocumentPage('code-of-ethics');
}
