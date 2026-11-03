import { versionDocumentMetadata, versionDocumentPage } from '../../../_documents';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  return versionDocumentMetadata('terms', params);
}

export default function Page({ params }: { params: Promise<{ number: string }> }) {
  return versionDocumentPage('terms', params);
}
