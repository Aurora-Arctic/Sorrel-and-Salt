'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import { NEW, newSpellElsewhere } from './add-href';

// `?new=spell-<slug>` on a page that is not that coven's grimoire: the address moves to the grimoire
// with the same value, replaced so Back does not return to the page that only sent the viewer on.
// Drawn once in the shell; the grimoire page reads its own value (grimoire-tab.tsx, SpellDialog).

function Redirect(): null {
  const pathname = usePathname();
  const value = useSearchParams().get(NEW);
  const { navigate } = usePendingNavigation();
  const target = newSpellElsewhere(value, pathname);
  useEffect(() => {
    if (target) navigate(target, { replace: true });
  }, [target, navigate]);
  return null;
}

/** In a Suspense boundary, as reading the address asks for. */
const NewSpellElsewhere = () => (
  <Suspense fallback={null}>
    <Redirect />
  </Suspense>
);

export default NewSpellElsewhere;
