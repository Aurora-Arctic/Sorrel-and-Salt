import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { requireAdminSession } from '@/lib/request-session';
import { readDocumentForEditing } from '@/modules/documents';
import type { DocumentKey } from '@/modules/documents';

export const metadata: Metadata = {
  title: 'Documents',
};

// The site's four documents, in the order the footer lists them.
const KEYS: readonly DocumentKey[] = ['privacy', 'disclaimer', 'code-of-ethics', 'terms'];

// One link per document to its editor. Admin only: the service refuses anyone else, and the guard gives a curator the not-authorised page.
export default async function AdminDocumentsPage() {
  const session = await requireAdminSession();
  const documents = await Promise.all(KEYS.map((key) => readDocumentForEditing(session, key)));
  return (
    <main>
      <PageHeader
        title="Documents"
        lede="Edit a document as a draft only you see, then publish it as a new version."
      />
      <ul>
        {documents.map(({ key, title, lede, draft }) => (
          <li key={key}>
            <Link href={`/admin/documents/${key}`}>{title}</Link>
            {draft ? ' (Draft Open)' : ''} <span>{lede}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
