import { versionDocumentPage } from '../../../_documents';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ number: string }> }) {
  return versionDocumentPage('disclaimer', params);
}
