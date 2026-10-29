import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import { viewerOf } from '../../lib/viewer';

// The application shell for every signed-in page, a route group so the public pages stay static. A
// layout does not re-run on client navigation, so each page calls its own guard. `viewerOf()` never
// sends an unverified account to the email page: thrown here, that redirect loops the router forever.
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const { viewer, workspaces } = await viewerOf();

  return (
    <AppShell viewer={viewer} workspaces={workspaces}>
      {children}
    </AppShell>
  );
}
