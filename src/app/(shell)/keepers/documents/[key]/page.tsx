import { orNotFound } from '@/lib/or-not-found';
import type { Metadata } from 'next';
import DocumentEditor from '@/components/DocumentEditor';
import { requireAdminSession } from '@/lib/request-session';
import { readDocumentForEditing } from '@/modules/documents';

export const metadata: Metadata = {
  title: 'Edit Document',
};

// The editor opens on the admin's own draft, else the published text. The page and GraphQL end at the same service.
export default async function AdminDocumentPage({ params }: { params: Promise<{ key: string }> }) {
  const session = await requireAdminSession();
  const { key } = await params;
  const document = await orNotFound(() => readDocumentForEditing(session, key));
  const { draft, published } = document;
  return (
    <DocumentEditor
      documentId={document.id}
      documentKey={document.key}
      title={document.title}
      lede={document.lede}
      body={draft?.body ?? published?.body ?? ''}
      publishedBody={published?.body ?? ''}
      revision={draft?.revision ?? null}
      nextNumber={(published?.number ?? 0) + 1}
    />
  );
}
