'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import { NEW, newSpellElsewhere } from './add-href';

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

const NewSpellElsewhere = () => (
  <Suspense fallback={null}>
    <Redirect />
  </Suspense>
);

export default NewSpellElsewhere;
