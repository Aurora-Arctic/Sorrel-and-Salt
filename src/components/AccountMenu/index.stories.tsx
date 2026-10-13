import type { Story } from '@ladle/react';
import { type ReactElement, useEffect, useRef } from 'react';
import AccountMenu from '.';

// Render-only; behaviour is asserted in tests/components/AccountMenu. The
// panel hangs from the button's right edge, so each story sits at the right.
// The wrapper keeps the menu at the top (`flex-start`), since stretched to the
// wrapper's height the panel would open from the menu's bottom edge, and is tall
// enough that the frame, which clips, holds the whole open panel.
export default {
  title: 'Shell / Account Menu',
};

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

export const Closed: Story = () => (
  <Right>
    <AccountMenu name="Fixture Member" verified />
  </Right>
);

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
            { label: 'Your Coven', href: '/coven/fixture-coven', base: '/coven' },
            { label: 'Admin', href: '/admin', base: '/admin' },
          ]}
        />
      </Right>
    </div>
  );
};

export const Open: Story = () => <Opened verified />;

// Two coven invitations waiting (M10.32): the dot on the disc, the count beside Your Account.
export const ClosedWithInvitations: Story = () => (
  <Right>
    <AccountMenu name="Fixture Member" verified pendingInvitations={2} />
  </Right>
);

export const OpenWithInvitations: Story = () => <Opened verified pendingInvitations={2} />;

// The same at a phone's width, the avatar alone in the bar.
export const OpenWithInvitationsPhone: Story = () => <Opened verified pendingInvitations={2} />;
OpenWithInvitationsPhone.meta = { width: 375 };

// Sign Out alone, the account page not yet being reachable.
export const OpenUnverified: Story = () => <Opened verified={false} />;

// A phone's width: the avatar alone, and the panel gains the links and the theme row.
export const OpenPhone: Story = () => <Opened verified />;
OpenPhone.meta = { width: 375 };

// Seven hundred pixels, past the phone: the links in the panel, and no theme item.
export const OpenAtSevenHundred: Story = () => <Opened verified />;
OpenAtSevenHundred.meta = { width: 700 };
