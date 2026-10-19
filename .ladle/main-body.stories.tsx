import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { PendingLink } from '../src/lib/navigation';
import { Navigating } from './navigating';
import { ShellFrame } from './shell-frame';

// The shell's body (src/components/AppShell/main-body.tsx), drawn by the shell
// itself: a page, and the one `page` skeleton that takes its place while a
// navigation aimed at the `main` region is on its way. A navigation here never
// arrives (./navigating.tsx), so the wait stays; "Start Over" ends it.
export default {
  title: 'Feedback / Loading / Main Body',
};

const Page = (): ReactElement => (
  <main className="page-frame">
    <h1>Your Account</h1>
    <p>
      <PendingLink href="/compendium" navigationTarget={{ region: 'main', shape: 'page' }}>
        Compendium
      </PendingLink>
    </p>
  </main>
);

// At rest the body shows its page. Press the link to see it swap.
export const AtRest: Story = () => (
  <Navigating>
    <ShellFrame area="none">
      <Page />
    </ShellFrame>
  </Navigating>
);

// The same page, opened with its link already pressed: the page has gone and
// the skeleton stands in a `main` of its own, under the page bar.
export const LoadingPage: Story = () => (
  <Navigating press="Compendium">
    <ShellFrame area="none">
      <Page />
    </ShellFrame>
  </Navigating>
);
