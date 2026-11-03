import { versionDocumentMetadata, versionDocumentPage } from '../../../_documents';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  return versionDocumentMetadata('code-of-ethics', params);
}

export default function Page({ params }: { params: Promise<{ number: string }> }) {
  return versionDocumentPage('code-of-ethics', params);
}
