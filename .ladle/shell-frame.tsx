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
// layout. The create page's row is the page's own, not a layout's, and the page
// draws it only for someone with a coven to switch to, as `new` does here.

export const FIXTURE_VIEWER: ShellViewer = {
  name: 'Fixture Member',
  canCurate: false,
  canCreate: true,
  verified: true,
  pendingInvitations: 0,
};

// `canReadMembers` is what the viewer's role there may do, as the layout
// reads it: a member of the first two, so the nav offers Members; a viewer of
// the third, so a switch to it from a people page lands on its index.
export const FIXTURE_WORKSPACES: readonly ShellWorkspace[] = [
  { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true },
  { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: true },
  {
    slug: 'a-long-named-circle-of-fixture-herbalists',
    name: 'A Long Named Circle of Fixture Herbalists',
    canReadMembers: false,
  },
];

const OPEN_COVEN = 'fixture-coven';

const DEFAULT_OPEN = {
  coven: '/coven/fixture-coven',
  admin: '/admin/users',
  new: '/coven/new',
  none: '/account',
};

export const ShellFrame = ({
  area = 'coven',
  viewer,
  workspaces = FIXTURE_WORKSPACES,
  open = DEFAULT_OPEN[area],
  children,
}: ShellFrameProps): ReactElement => {
  const who = { ...FIXTURE_VIEWER, ...viewer };
  // The nav asks of the open coven what the layout asks of the membership;
  // a story's own list without it falls back to a member's view.
  const canReadMembers =
    workspaces.find((workspace) => workspace.slug === OPEN_COVEN)?.canReadMembers ?? true;
  return (
    <WorkshopPathname.Provider value={open}>
      <AppShell viewer={who} workspaces={workspaces}>
        {area === 'coven' && (
          <>
            <ContextRow
              lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={who.canCreate} />}
            >
              <CovenNav slug={OPEN_COVEN} canReadMembers={canReadMembers} />
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
        {/* /coven/new: the switcher alone, no section nav, and no wrapper div
            (src/app/(shell)/coven/new/page.tsx). */}
        {area === 'new' && (
          <>
            {workspaces.length > 0 && (
              <ContextRow
                lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={who.canCreate} />}
              />
            )}
            {children}
          </>
        )}
        {area === 'none' && children}
      </AppShell>
    </WorkshopPathname.Provider>
  );
};
