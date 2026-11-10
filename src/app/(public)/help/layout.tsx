import type { ReactNode } from 'react';
import HelpFront from '@/components/HelpFront';
import { helpViewerOffers } from '@/lib/help-viewer';

// One header for every public help page, so it stays mounted while the page beneath it changes.
export default async function HelpLayout({ children }: { children: ReactNode }) {
  const { staffHelp } = await helpViewerOffers();
  return <HelpFront staffHelp={staffHelp}>{children}</HelpFront>;
}
