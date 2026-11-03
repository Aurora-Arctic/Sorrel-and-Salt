import { versionDocumentPage } from '../../../_documents';
import { PRIVACY_PLACEHOLDERS } from '../../placeholders';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ number: string }> }) {
  return versionDocumentPage('privacy', params, PRIVACY_PLACEHOLDERS);
}
