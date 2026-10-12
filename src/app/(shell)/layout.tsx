import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import { requireSession } from '../../lib/request-session';
import { viewerOf } from '../../lib/viewer';

// Every signed-in page (`/account`, `/coven`, `/admin`) sits in the
// application shell (MB.7). A route group, so the URLs are unchanged, and a
// layout of its own rather than the root's because the root stays free of the
// session: a public page there (the compendium, sign-in) is then static. A
// layout does not re-run on client-side navigation, so the pages beneath still
// call their own guards; this one is what the shell needs to draw, and
// `requireSession()` also sends a signed-out visitor to sign in and an
// unverified one to the email page, the one page it lets through.
export default async function ShellLayout({ children }: { children: ReactNode }) {
  await requireSession();
  const { viewer, workspaces } = await viewerOf();

  return (
    <AppShell viewer={viewer} workspaces={workspaces}>
      {children}
    </AppShell>
  );
}
