import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import LinkHint from '../src/components/LinkHint';
import { PendingLink } from '../src/lib/navigation';
import { Navigating } from './navigating';

// The site's one link (src/lib/navigation/pending-link.tsx). Pressed, it sets `aria-busy` and tells
// its `LinkHint` to show its dot. The target `coven` region has no body in this frame, so only the
// link shows the wait; the navigation never arrives (./navigating.tsx).
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
