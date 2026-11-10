import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import { LinkIcon } from '../IconTip';
import Spinner from '../Spinner';
import './index.scss';

const meta = {
  title: 'Navigation / Link Hint',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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
