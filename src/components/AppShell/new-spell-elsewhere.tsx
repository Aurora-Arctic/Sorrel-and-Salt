'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import { NEW, newSpellElsewhere } from './add-href';

// `?new=spell-<slug>` on a page that is not that coven's grimoire (M10.12, the owner's call,
// 2026-10-28). New Spell is a dialog over the grimoire, so the address moves there with the
// same value, replaced so Back does not return to a page that only sent the viewer on. Drawn
// once in the shell, beside Add Ingredient, which reads the same parameter. A grimoire
// page's own `?new=spell-<slug>` is read there (grimoire-tab.tsx, SpellDialog).

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
