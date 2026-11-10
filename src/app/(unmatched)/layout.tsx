import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import PublicFrame from '@/components/PublicFrame';
import { viewerIfSignedIn } from '@/lib/viewer';
// Server component, so the env var names this reads never reach the client bundle; only the `configured` ids pass as a prop.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '@/lib/social-providers-config';

// The frame for an address no page answers: the shell for a signed-in visitor, the public frame
// (whose bar carries Sign In) for anyone else. The 404 screen draws its own `<main>`.
export default async function UnmatchedLayout({ children }: { children: ReactNode }) {
  const shell = await viewerIfSignedIn();

  if (!shell) return <PublicFrame configured={configuredProviders()}>{children}</PublicFrame>;
  return (
    <AppShell viewer={shell.viewer} workspaces={shell.workspaces}>
      {children}
    </AppShell>
  );
}
