import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import LinkHint from '../src/components/LinkHint';
import { PendingLink } from '../src/lib/navigation';
import { Navigating } from './navigating';

// The site's one link (src/lib/navigation/pending-link.tsx). Pressed, it sets
// `aria-busy` and tells the `LinkHint` inside it to show its dot. The target
// is a `coven` region with no body in this frame to answer it, so the page
// stays and only the link shows the wait. A navigation here never arrives
// (./navigating.tsx); "Start Over" ends it.
const meta = {
  title: 'Feedback / Pending Link',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Link = (): ReactElement => (
  <p>
    <PendingLink href="/compendium" navigationTarget={{ region: 'coven', shape: 'table' }}>
      Compendium <LinkHint />
    </PendingLink>
  </p>
);

// At rest: no dot, no `aria-busy`. Press the link to see the wait.
export const Default: Story = {
  render: () => (
    <Navigating>
      <Link />
    </Navigating>
  ),
};

// Opened with the link already pressed: the dot shows after its text.
export const Pending: Story = {
  render: () => (
    <Navigating press="Compendium">
      <Link />
    </Navigating>
  ),
};
