import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import { viewerOf } from '../../lib/viewer';

// Every signed-in page sits in the application shell, a route group of its own so the root stays free
// of the session and the public pages there stay static. A layout does not re-run on client-side
// navigation, so the pages beneath call their own guards; this one only draws the shell. `viewerOf()`
// sends a signed-out visitor to sign in but never an unverified one to the email page: thrown here
// while the browser navigated into the shell, that redirect left the router refetching the email page
// without end, so the page's own `requireSession()` throws it.
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const { viewer, workspaces } = await viewerOf();

  return (
    <AppShell viewer={viewer} workspaces={workspaces}>
      {children}
    </AppShell>
  );
}
