'use client';

import type { ReactElement } from 'react';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { useSession } from '../lib/auth-client';

// The banner's slot in the root layout (MB.53), which mounts it only where
// impersonation is registered — never at production. Read in the browser
// rather than the layout: a session read there would make every page
// dynamic, the public compendium's included.
export default function ImpersonationBannerSlot(): ReactElement | null {
  const { data } = useSession();
  // The type is the client's, which knows the plugin's session field.
  if (!data?.session.impersonatedBy) return null;
  return <ImpersonationBanner name={data.user.name} email={data.user.email} />;
}
