import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell';
import { viewerOf } from '../../lib/viewer';

// Every signed-in page (`/account`, `/coven`, `/admin`) sits in the
// application shell (MB.7). A route group, so the URLs are unchanged, and a
// layout of its own rather than the root's because the root stays free of the
// session: a public page there (the compendium, sign-in) is then static. A
// layout does not re-run on client-side navigation, so the pages beneath call
// their own guards; this one only draws the shell. `viewerOf()` sends a
// signed-out visitor to sign in, but never an unverified one to the email
// page: that redirect, thrown here while the browser navigated into the
// shell, left the router refetching the email page without end (MB.256). The
// page's own `requireSession()` throws it instead.
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const { viewer } = await viewerOf();

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
