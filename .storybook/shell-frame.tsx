import type { ReactElement } from 'react';
import AdminNav from '../src/components/AdminNav';
import { adminTarget } from '../src/components/AdminNav/target';
import AppShell from '../src/components/AppShell';
import ContextRow from '../src/components/ContextRow';
import CovenNav from '../src/components/CovenNav';
import { CovenSwitchProvider } from '../src/components/CovenSwitchTargets/context';
import { RouteModalProvider } from '../src/components/Modal/route-modal-provider';
import PublicFrame from '../src/components/PublicFrame';
import SectionBody from '../src/components/SectionBody';
import WorkspaceSwitcher from '../src/components/WorkspaceSwitcher';
import { PendingLink } from '../src/lib/navigation';
import type { ShellViewer, ShellWorkspace } from '../src/lib/types';
import { WorkshopPathname } from './navigation';
import type { ShellFrameProps } from './types';

// The application shell around a story, as `src/app/(shell)/layout.tsx` and the area layouts draw
// it, in fixture-prop markup (the layouts are server components that read the session). The create
// page's row is the page's own, drawn only for someone with a coven to switch to, as `new` does here.
// `role` is the admin area's: an admin sees People in its nav, a curator does not.

export const FIXTURE_VIEWER: ShellViewer = {
  name: 'Fixture Member',
  canCurate: false,
  canCreate: true,
  verified: true,
  pendingInvitations: 0,
  assignedSupport: 0,
  waitingSupport: 0,
};

// `canReadMembers` is what the viewer's role there may do, as the layout
// reads it: a member of the first two, so the nav offers Members; a viewer of
// the third, so a switch to it from a people page lands on its index.
export const FIXTURE_WORKSPACES: readonly ShellWorkspace[] = [
  {
    id: 'w1',
    slug: 'fixture-coven',
    name: 'Fixture Coven',
    canReadMembers: true,
    canInvite: true,
    canWrite: true,
  },
  {
    id: 'w2',
    slug: 'testwort-circle',
    name: 'Testwort Circle',
    canReadMembers: true,
    canInvite: true,
    canWrite: true,
  },
  {
    id: 'w3',
    slug: 'a-long-named-circle-of-fixture-herbalists',
    name: 'A Long Named Circle of Fixture Herbalists',
    canReadMembers: false,
    canInvite: false,
    canWrite: false,
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
  role = 'admin',
  viewer,
  workspaces = FIXTURE_WORKSPACES,
  open = DEFAULT_OPEN[area],
  signedOut = false,
  children,
}: ShellFrameProps): ReactElement => {
  const who = { ...FIXTURE_VIEWER, ...viewer };
  // The nav asks of the open coven what the layout asks of the membership;
  // a story's own list without it falls back to a member's view.
  const canReadMembers =
    workspaces.find((workspace) => workspace.slug === OPEN_COVEN)?.canReadMembers ?? true;
  // A visitor with no session: the public layout's frame, the site name and Sign In.
  if (signedOut)
    return (
      <WorkshopPathname.Provider value={open === DEFAULT_OPEN[area] ? '/compendium' : open}>
        <PublicFrame>{children}</PublicFrame>
      </WorkshopPathname.Provider>
    );
  return (
    <WorkshopPathname.Provider value={open}>
      <AppShell viewer={who} workspaces={workspaces}>
        {area === 'coven' && (
          <CovenSwitchProvider>
            <ContextRow
              lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={who.canCreate} />}
            >
              <CovenNav slug={OPEN_COVEN} canReadMembers={canReadMembers} />
            </ContextRow>
            <SectionBody region="coven" className="coven-layout">
              {children}
            </SectionBody>
          </CovenSwitchProvider>
        )}
        {area === 'admin' && (
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
              <AdminNav managesPeople={role === 'admin'} />
            </ContextRow>
            <SectionBody region="admin" className="page-column">
              {children}
            </SectionBody>
          </RouteModalProvider>
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
