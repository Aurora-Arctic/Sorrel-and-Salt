import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { PendingLink } from '../src/lib/navigation';
import { Navigating } from './navigating';
import { ShellFrame } from './shell-frame';

// The shell's body (src/components/AppShell/main-body.tsx), drawn by the shell
// itself: a page, and the one `page` skeleton that takes its place while a
// navigation aimed at the `main` region is on its way. A navigation here never
// arrives (./navigating.tsx), so the wait stays; "Start Over" ends it.
const meta = {
  title: 'Feedback / Main Body',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// One link per destination frame, each named for the frame its wait is drawn in.
const Page = (): ReactElement => (
  <main className="page-frame">
    <h1>Your Account</h1>
    <ul>
      <li>
        <PendingLink href="/compendium" navigationTarget={{ region: 'main', shape: 'page' }}>
          Compendium
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/compendium"
          navigationTarget={{
            region: 'main',
            shape: 'cards',
            frame: 'wide',
            title: true,
            filter: true,
          }}
        >
          Wide
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/coven"
          navigationTarget={{ region: 'main', shape: 'page', frame: 'narrow' }}
        >
          Narrow
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/account"
          navigationTarget={{ region: 'main', shape: 'page', frame: 'with-nav' }}
        >
          With Menu
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/coven/new"
          navigationTarget={{ region: 'main', shape: 'form', frame: 'narrow' }}
        >
          Form
        </PendingLink>
      </li>
    </ul>
  </main>
);

// At rest the body shows its page. Press the link to see it swap.
export const Default: Story = {
  render: () => (
    <Navigating bar>
      <ShellFrame area="none">
        <Page />
      </ShellFrame>
    </Navigating>
  ),
};

// The same page, opened with its link already pressed: the page has gone and
// the skeleton stands in a `main` of its own, under the page bar.
export const LoadingPage: Story = {
  render: () => (
    <Navigating bar press="Compendium">
      <ShellFrame area="none">
        <Page />
      </ShellFrame>
    </Navigating>
  ),
};

// The wait is drawn in the destination's own frame, top-aligned, never
// centred down the window: the wide column of the Compendium's cards, the forms'
// column of the coven index, the account's jump menu beside its sections, and
// Create Coven's form on its panel.
export const LoadingWide: Story = {
  render: () => (
    <Navigating bar press="Wide">
      <ShellFrame area="none">
        <Page />
      </ShellFrame>
    </Navigating>
  ),
};

export const LoadingNarrow: Story = {
  render: () => (
    <Navigating bar press="Narrow">
      <ShellFrame area="none">
        <Page />
      </ShellFrame>
    </Navigating>
  ),
};

export const LoadingWithMenu: Story = {
  render: () => (
    <Navigating bar press="With Menu">
      <ShellFrame area="none">
        <Page />
      </ShellFrame>
    </Navigating>
  ),
};

export const LoadingForm: Story = {
  render: () => (
    <Navigating bar press="Form">
      <ShellFrame area="none">
        <Page />
      </ShellFrame>
    </Navigating>
  ),
};
