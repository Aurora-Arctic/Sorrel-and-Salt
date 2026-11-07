'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import { NEW, newSpellElsewhere } from './add-href';

// Replaced, so Back does not return to the page that only sent the viewer on.
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
