import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/page-metadata';
import SupportRequestByLink from '../../../../components/SupportRequestByLink';

// The page a signed-out sender's mails link to. The token sits in the URL fragment, which the server never sees, so the page
// is the same for everyone and reads the request in the browser. Never indexed or stored: src/lib/security-headers.ts sends
// no-store and no referrer for it.
export const metadata: Metadata = noIndexMetadata('Your Support Request', false);

export default function SupportRequestByLinkPage() {
  return <SupportRequestByLink />;
}
