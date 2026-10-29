import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import PublicFrame from '../../components/PublicFrame';
import { viewerIfSignedIn } from '../../lib/viewer';

// The frame for pages a signed-out visitor may open; a route group, so URLs are unchanged. It reads
// `viewerIfSignedIn()`, never a redirecting guard: a signed-in visitor gets the shell, others this
// frame. The layout owns `<main>`, so one landmark stays while the skeleton swaps in.
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
