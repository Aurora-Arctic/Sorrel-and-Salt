import type { Story } from '@ladle/react';
import { type ReactElement, useEffect, useRef } from 'react';
import AccountMenu from '.';

// Render-only; behaviour is asserted in tests/components/AccountMenu. The
// panel hangs from the button's right edge, so each story sits at the right.
export default {
  title: 'AccountMenu',
};

const Right = ({ children }: { children: ReactElement }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '14rem' }}>{children}</div>
);

export const Closed: Story = () => (
  <Right>
    <AccountMenu name="Fixture Member" verified />
  </Right>
);

// Opened once on mount, as a press on it would.
const Opened = ({ verified }: { verified: boolean }): ReactElement => {
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

// Sign Out alone, the account page not yet being reachable.
export const OpenUnverified: Story = () => <Opened verified={false} />;

// A phone's width: the avatar alone, and the panel gains the links and the theme row.
export const OpenPhone: Story = () => <Opened verified />;
OpenPhone.meta = { width: 375 };

// Seven hundred pixels, past the phone: the links in the panel, and no theme item.
export const OpenAtSevenHundred: Story = () => <Opened verified />;
OpenAtSevenHundred.meta = { width: 700 };
