import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import PublicFrame from '../../components/PublicFrame';
import { viewerIfSignedIn } from '../../lib/viewer';

// The frame for the pages a signed-out visitor may open (the compendium,
// MB.83). A route group, so the URLs are unchanged. It reads the session when
// there is one, with `viewerIfSignedIn()`, never a guard that redirects: a
// signed-in visitor gets the application shell, a signed-out one the public
// frame, both drawn on the server with no script needed. A page beneath may
// read the viewer the same way, to offer a curator Edit; the cached compendium
// reads take no session, so a private value cannot reach them. An unverified account gets the shell too, as it is signed in: the
// shell offers it Sign Out and the Compendium link, which is as public as
// any page here.
//
// Either way the page sits in `.page-column`, the top-left wide column the
// admin pages share, so M8.18's page lands where /admin/compendium does.
// Either way the layout owns `<main>`, which a page here therefore does not
// render, and either chrome's `#main` is a wrapper round it: while a move
// between pages is on its way, the frame's body swaps this `main` for the
// skeleton's own, so the page keeps one landmark (M12.47).
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
