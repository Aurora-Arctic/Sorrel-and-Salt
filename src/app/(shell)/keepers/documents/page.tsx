import type { Metadata } from 'next';
import DocumentMailingPanel from '@/components/DocumentMailingPanel';
import { requireAdminSession } from '@/lib/request-session';
import { readDocumentMailings } from '@/modules/documents';

export const metadata: Metadata = {
  title: 'Email Updates',
};

// Every document changed since the last email, mailed to every account in one email. The page and GraphQL end at the same service.
export default async function AdminDocumentMailingPage() {
  const session = await requireAdminSession();
  return <DocumentMailingPanel overview={await readDocumentMailings(session)} />;
}
