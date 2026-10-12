import type { ReactElement } from 'react';
import AdminNav from '../src/components/AdminNav';
import AppShell from '../src/components/AppShell';
import ContextRow from '../src/components/ContextRow';
import CovenNav from '../src/components/CovenNav';
import WorkspaceSwitcher from '../src/components/WorkspaceSwitcher';
import type { ShellViewer, ShellWorkspace } from '../src/lib/types';
import { WorkshopPathname } from './navigation';
import type { ShellFrameProps } from './types';

// The application shell around a story, as `src/app/(shell)/layout.tsx` and
// the area layouts draw it: the bar, the context row, then the page. Not the
// layouts themselves, which are server components that read the session; this
// is their markup with fixture props, as ./admin-frame.tsx is for the admin
// layout.

export const FIXTURE_VIEWER: ShellViewer = {
  name: 'Fixture Member',
  isAdmin: false,
  canCreate: true,
  verified: true,
};

export const FIXTURE_WORKSPACES: readonly ShellWorkspace[] = [
  { slug: 'fixture-coven', name: 'Fixture Coven' },
  { slug: 'testwort-circle', name: 'Testwort Circle' },
  {
    slug: 'a-long-named-circle-of-fixture-herbalists',
    name: 'A Long Named Circle of Fixture Herbalists',
  },
];

const DEFAULT_OPEN = { coven: '/coven/fixture-coven', admin: '/admin/users', none: '/account' };

export const ShellFrame = ({
  area = 'coven',
  viewer,
  workspaces = FIXTURE_WORKSPACES,
  open = DEFAULT_OPEN[area],
  children,
}: ShellFrameProps): ReactElement => {
  const who = { ...FIXTURE_VIEWER, ...viewer };
  return (
    <WorkshopPathname.Provider value={open}>
      <AppShell viewer={who} workspaces={workspaces}>
        {area === 'coven' && (
          <>
            <ContextRow
              lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={who.canCreate} />}
            >
              <CovenNav slug="fixture-coven" />
            </ContextRow>
            <div className="coven-layout">{children}</div>
          </>
        )}
        {area === 'admin' && (
          <>
            <ContextRow lead={<span className="context-row__name">Admin</span>}>
              <AdminNav />
            </ContextRow>
            <div className="admin-layout">{children}</div>
          </>
        )}
        {area === 'none' && children}
      </AppShell>
    </WorkshopPathname.Provider>
  );
};
