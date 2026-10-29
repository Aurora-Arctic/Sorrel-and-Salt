import type { ReactElement, ReactNode } from 'react';
import AdminNav from '../src/components/AdminNav';
import { ADMIN_PAGES } from '../src/components/AdminNav/sections';
import { adminTarget } from '../src/components/AdminNav/target';
import { RouteModalProvider } from '../src/components/Modal/route-modal-provider';
import SectionBody from '../src/components/SectionBody';
import { PendingLink } from '../src/lib/navigation';
import ContextRow from '../src/components/ContextRow';
import TabbedPage from '../src/components/TabbedPage';
import { WorkshopPathname } from './navigation';
import { ShellFrame } from './shell-frame';
import type { AdminFrameProps, AdminTabbedFrameProps } from './types';

// The admin layout's frame for a story, so the workshop shows a component as
// an admin page holds it. Not the
// app's own `src/app/(shell)/admin/layout.tsx`, which is a server component that
// reads the session; this is its markup alone, with the route-modal provider and the
// section body it draws. The layout puts the context row, "Admin" and the nav,
// above the `.page-column` column that holds the page, so the frame does too,
// all inside the shell's `.app-shell__main`, which keeps the last row clear of
// the phone's bottom nav (_primitives.scss).

// A provider only where a story names an address; without one the stub's own default stands.
const Opened = ({ at, children }: { at?: string; children: ReactNode }): ReactElement =>
  at === undefined ? (
    <>{children}</>
  ) : (
    <WorkshopPathname.Provider value={at}>{children}</WorkshopPathname.Provider>
  );

/**
 * The admin layout as it is: the context row with the nav, then the
 * `.page-column` column around `children`. `open` is the address the
 * workshop pretends to be on (./navigation.ts), which decides the nav's
 * current page; the People page's Users tab by default. `managesPeople`
 * false draws a curator's nav, without People.
 */
export const AdminFrame = ({
  open,
  managesPeople = true,
  shell = false,
  children,
}: AdminFrameProps): ReactElement =>
  shell ? (
    // The app shell's bar around the same row and column, as the site draws them.
    <ShellFrame
      area="admin"
      role={managesPeople ? 'admin' : 'curator'}
      viewer={{ canCurate: true }}
      open={open}
    >
      {children}
    </ShellFrame>
  ) : (
    <Opened at={open}>
      <div className="app-shell__main">
        <RouteModalProvider>
          <ContextRow
            lead={
              <PendingLink
                href="/admin"
                className="context-row__name"
                navigationTarget={adminTarget('/admin')}
              >
                Admin
              </PendingLink>
            }
          >
            <AdminNav managesPeople={managesPeople} />
          </ContextRow>
          <SectionBody region="admin" className="page-column">
            {children}
          </SectionBody>
        </RouteModalProvider>
      </div>
    </Opened>
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
  shell,
  children,
}: AdminTabbedFrameProps): ReactElement => (
  <AdminFrame open={open} shell={shell}>
    <TabbedPage title={ADMIN_PAGES[page].label} tabs={ADMIN_PAGES[page].tabs} action={action}>
      {children}
    </TabbedPage>
  </AdminFrame>
);
