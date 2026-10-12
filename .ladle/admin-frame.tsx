import type { ReactElement, ReactNode } from 'react';
import AdminNav from '../src/components/AdminNav';
import { ADMIN_PAGES } from '../src/components/AdminNav/sections';
import TabbedPage from '../src/components/TabbedPage';
import { WorkshopPathname } from './navigation';
import type { AdminTabbedFrameProps } from './types';

// The admin layout's frame for a story, so the workshop shows a component as
// an admin page holds it: nine stories drew it by hand before MB.115. Not the
// app's own `src/app/(shell)/admin/layout.tsx`, which is a server component that
// reads the session; this is its markup alone.

/** The `.admin-layout` frame alone, for a story of a piece the frame holds: the nav, a page header. */
export const AdminFrame = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="admin-layout">{children}</div>
);

/**
 * A tabbed admin page as its route draws it: the frame, the page's heading
 * and tabs from `ADMIN_PAGES`, `action` beside the heading, and the open
 * tab's content beneath. `open` is the address the workshop pretends to be
 * on (./navigation.ts), which decides the tab shown open.
 */
export const AdminTabbedFrame = ({
  page,
  open = ADMIN_PAGES[page].tabs[0].href,
  action,
  nav = false,
  children,
}: AdminTabbedFrameProps): ReactElement => (
  <WorkshopPathname.Provider value={open}>
    <AdminFrame>
      {nav && <AdminNav />}
      <TabbedPage title={ADMIN_PAGES[page].label} tabs={ADMIN_PAGES[page].tabs} action={action}>
        {children}
      </TabbedPage>
    </AdminFrame>
  </WorkshopPathname.Provider>
);
