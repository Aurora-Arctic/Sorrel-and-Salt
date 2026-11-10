'use client';

import type { ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import HelpSearchForm from '../HelpSearchForm';

/** The hero search box, holding the words the search page was opened with, and none on any other help page. */
export default function HelpFrontSearch(): ReactElement {
  const pathname = usePathname();
  const q = useSearchParams().get('q');
  return (
    <HelpSearchForm size="hero" query={pathname === '/help/search' ? (q?.trim() ?? '') : ''} />
  );
}
