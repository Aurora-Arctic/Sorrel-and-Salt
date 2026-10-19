import type { Story } from '@ladle/react';
import { LinkIcon } from '../IconTip';
import Spinner from '../Spinner';
import './index.scss';

// The workshop has no Next router, so `useLinkStatus` (stubbed in
// .ladle/UnoptimizedLink.tsx) is always false. The two states are drawn as
// the markup `LinkHint` renders for each; behaviour is asserted in
// tests/components/LinkHint.
export default {
  title: 'Navigation / Link Hint',
};

export const Idle: Story = () => (
  <a href="#idle">
    Emerald <span aria-hidden="true" className="link-hint" />
  </a>
);

export const Pending: Story = () => (
  <a href="#pending">
    Emerald <span aria-hidden="true" className="link-hint is-pending" />
  </a>
);

// A link that wears the chain icon has no dot: the icon turns into the ring.
// Drawn as the markup `LinkIconHint` renders for each state.
export const IconIdle: Story = () => (
  <a href="#icon-idle">
    Emerald{' '}
    <span className="link-icon-hint">
      <LinkIcon />
    </span>
  </a>
);

export const IconPending: Story = () => (
  <a href="#icon-pending" aria-busy="true">
    Emerald{' '}
    <span className="link-icon-hint is-pending">
      <LinkIcon />
      <Spinner />
    </span>
  </a>
);
