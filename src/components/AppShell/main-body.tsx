'use client';

import type { ReactElement, ReactNode } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Skeleton from '../Skeleton';

// The shell's body while a site-level navigation is on its way (M12.33): the
// page that was there gives way to one skeleton, in a `main` of its own so the
// page keeps its landmark during the wait (the pages draw their own `main`,
// which the skeleton replaces). Only a `main` target is answered here; a
// `coven` or `admin` target is `SectionBody`'s, and no target at all (a refresh) leaves the
// page standing. The page's own heading goes with it, so the wait carries a
// hidden one: a page without a level-one heading fails the accessibility scan.
// A client part, since the state is the browser's.
// claude-docs/components/app-shell.md
// The frame the destination sits in, so the wait is the page's width and
// place rather than the standard centred `.page-frame` (66ch, drawn down the
// window): the wide column for the wide pages and the menu pages, the forms'
// column for the narrow ones. The standard frame stays for a target that names
// none (the brand link's). A `skeleton-frame` is top-aligned, never centred.
const FRAME_CLASS = {
  wide: 'page-column',
  'with-nav': 'page-column',
  narrow: 'page-frame page-frame--narrow skeleton-frame',
} as const;

const MainBody = ({ children }: { children: ReactNode }): ReactElement => {
  const { busy, target } = useNavigationState();
  if (busy && target?.region === 'main') {
    const skeleton = (
      <Skeleton
        shape={target.shape}
        title={target.title}
        action={target.action}
        tabs={target.tabs}
        filter={target.filter}
        menu={target.frame === 'with-nav'}
        head={target.head}
      />
    );
    return (
      <main className={target.frame ? FRAME_CLASS[target.frame] : 'page-frame skeleton-frame'}>
        <h1 className="visually-hidden">Loading</h1>
        {target.shape === 'form' && target.frame === 'narrow' ? (
          <div className="page-frame__section panel">{skeleton}</div>
        ) : (
          skeleton
        )}
      </main>
    );
  }
  return <>{children}</>;
};

export default MainBody;
