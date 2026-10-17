import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import PublicFrame from '../../components/PublicFrame';
import { viewerIfSignedIn } from '../../lib/viewer';

// The frame for the pages a signed-out visitor may open (the compendium,
// MB.83). A route group, so the URLs are unchanged. It reads the session when
// there is one, with `viewerIfSignedIn()`, never a guard that redirects: a
// signed-in visitor gets the application shell, a signed-out one the public
// frame, both drawn on the server with no script needed. The pages beneath
// read no session, so a private value cannot reach the cached compendium
// reads. An unverified account gets the shell too, as it is signed in: the
// shell offers it Sign Out and the Compendium link, which is as public as
// any page here.
//
// Either way the page sits in `.admin-layout`, the column the admin pages use
// (top-left, wide, not centred), so M8.18's page lands where /admin/compendium does.
// Either way the layout owns `<main>`, which a page here therefore does not
// render: PublicFrame draws `main#main`, and AppShell's `#main` wraps this one.
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const shell = await viewerIfSignedIn();

  if (!shell)
    return (
      <PublicFrame>
        <div className="admin-layout">{children}</div>
      </PublicFrame>
    );
  return (
    <AppShell viewer={shell.viewer} workspaces={shell.workspaces}>
      <main>
        <div className="admin-layout">{children}</div>
      </main>
    </AppShell>
  );
}
