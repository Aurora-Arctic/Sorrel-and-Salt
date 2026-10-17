import type { Story } from '@ladle/react';
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
