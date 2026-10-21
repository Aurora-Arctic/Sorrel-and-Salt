import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useEffect, useRef } from 'react';
import AccountMenu from '.';
import { route } from '../../../.storybook/route';

// Render-only; behaviour is asserted in tests/components/AccountMenu. The
// panel hangs from the button's right edge, so each story sits at the right.
// The wrapper keeps the menu at the top (`flex-start`), since stretched to the
// wrapper's height the panel would open from the menu's bottom edge, and is tall
// enough that the frame, which clips, holds the whole open panel.
const meta = {
  title: 'Shell / Account Menu',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Right = ({ children }: { children: ReactElement }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      minHeight: '18rem',
    }}
  >
    {children}
  </div>
);

export const Default: Story = {
  render: () => (
    <Right>
      <AccountMenu name="Fixture Member" verified />
    </Right>
  ),
};

// Opened once on mount, as a press on it would.
const Opened = ({
  verified,
  pendingInvitations,
}: {
  verified: boolean;
  pendingInvitations?: number;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.click();
  }, []);
  return (
    <div ref={ref}>
      <Right>
        <AccountMenu
          name="Fixture Member"
          verified={verified}
          pendingInvitations={pendingInvitations}
          links={[
            { label: 'Your Coven', href: route('/coven/fixture-coven'), base: '/coven' },
            { label: 'Admin', href: '/admin', base: '/admin' },
          ]}
        />
      </Right>
    </div>
  );
};

export const Open: Story = { render: () => <Opened verified /> };

// Two coven invitations waiting (M10.32): the dot on the disc, the count beside Your Account.
export const ClosedWithInvitations: Story = {
  render: () => (
    <Right>
      <AccountMenu name="Fixture Member" verified pendingInvitations={2} />
    </Right>
  ),
};

export const OpenWithInvitations: Story = {
  render: () => <Opened verified pendingInvitations={2} />,
};

// Sign Out alone, the account page not yet being reachable.
export const OpenUnverified: Story = { render: () => <Opened verified={false} /> };
