import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import PublicFrame from '@/components/PublicFrame';
import PageColumn from '@/components/PageColumn';
import { viewerIfSignedIn } from '@/lib/viewer';
// Server component, so the env var names this reads never reach the client bundle; only the `configured` ids pass as a prop.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '@/lib/social-providers-config';

// The frame for pages a signed-out visitor may open; a route group, so URLs are unchanged. It reads
// `viewerIfSignedIn()`, never a redirecting guard: a signed-in visitor gets the shell, others this
// frame. The layout owns `<main>`, so one landmark stays while the skeleton swaps in.
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const shell = await viewerIfSignedIn();
  const page = (
    <main>
      <PageColumn as="div">{children}</PageColumn>
    </main>
  );

  if (!shell) return <PublicFrame configured={configuredProviders()}>{page}</PublicFrame>;
  return (
    <AppShell viewer={shell.viewer} workspaces={shell.workspaces}>
      {page}
    </AppShell>
  );
}
