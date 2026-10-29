import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import { LinkIcon } from '../IconTip';
import Spinner from '../Spinner';
import './index.scss';

// The workshop has no Next router, so `useLinkStatus` (stubbed in
// .storybook/UnoptimizedLink.tsx) is always false. The two states are drawn as the
// markup `LinkHint` renders; behaviour is asserted in tests/components/LinkHint.
const meta = {
  title: 'Navigation / Link Hint',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// A link that wears the chain icon has no dot: the icon turns into the ring. Drawn as the markup
// `LinkIconHint` renders for each state.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="10rem"
      states={{
        Idle: (
          <a href="#idle">
            Emerald <span aria-hidden="true" className="link-hint" />
          </a>
        ),
        Pending: (
          <a href="#pending">
            Emerald <span aria-hidden="true" className="link-hint is-pending" />
          </a>
        ),
        'Icon Idle': (
          <a href="#icon-idle">
            Emerald{' '}
            <span className="link-icon-hint">
              <LinkIcon />
            </span>
          </a>
        ),
        'Icon Pending': (
          <a href="#icon-pending" aria-busy="true">
            Emerald{' '}
            <span className="link-icon-hint is-pending">
              <LinkIcon />
              <Spinner />
            </span>
          </a>
        ),
      }}
    />
  ),
};
