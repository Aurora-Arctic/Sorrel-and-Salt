import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import PublicFrame from '../../components/PublicFrame';
import { viewerIfSignedIn } from '../../lib/viewer';

// The frame for the pages a signed-out visitor may open. A route group, so the URLs are unchanged.
// It reads the session with `viewerIfSignedIn()`, never a guard that redirects: a signed-in visitor
// (verified or not) gets the application shell, a signed-out one the public frame. Either way the
// page sits in `.page-column`, and the layout owns `<main>`, which a page here does not render; the
// wrapper keeps one landmark while the skeleton swaps in during a move between pages.
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const shell = await viewerIfSignedIn();

  if (!shell)
    return (
      <PublicFrame>
        <main>
          <div className="page-column">{children}</div>
        </main>
      </PublicFrame>
    );
  return (
    <AppShell viewer={shell.viewer} workspaces={shell.workspaces}>
      <main>
        <div className="page-column">{children}</div>
      </main>
    </AppShell>
  );
}
