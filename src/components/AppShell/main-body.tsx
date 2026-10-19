'use client';

import type { ReactElement, ReactNode } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Skeleton from '../Skeleton';

// The shell's body while a site-level navigation is on its way (M12.33): the
// page that was there gives way to one skeleton, in a `main` of its own so the
// page keeps its landmark during the wait (the pages draw their own `main`,
// which the skeleton replaces). Only a `main` target is answered here; a
// `coven` target is `CovenBody`'s, and no target at all (a refresh) leaves the
// page standing. A client part, since the state is the browser's.
// claude-docs/components/app-shell.md
const MainBody = ({ children }: { children: ReactNode }): ReactElement => {
  const { busy, target } = useNavigationState();
  if (busy && target?.region === 'main') {
    return (
      <main className="page-frame">
        <Skeleton shape={target.shape} />
      </main>
    );
  }
  return <>{children}</>;
};

export default MainBody;
