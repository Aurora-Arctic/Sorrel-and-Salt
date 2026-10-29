import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, type ReactNode, useEffect, useRef } from 'react';
import AccountMenu from '.';
import { WorkshopPathname } from '../../../.storybook/navigation';
import { press } from '../../../.storybook/press';
import { route } from '../../../.storybook/route';

// Render-only; behaviour is asserted in tests/components/AccountMenu. The panel
// hangs from the button's right edge, so each story sits at the right, with a
// tall `flex-start` wrapper so the clipping frame holds the open panel.
const meta = {
  title: 'Shell / Account Menu',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

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

const LINKS = [
  { label: 'Your Coven', href: route('/coven/fixture-coven'), base: '/coven' },
  { label: 'Admin', href: '/admin' as const, base: '/admin' },
];

// Opened once on mount, as a press on it would; `failSignOut` then presses Sign
// Out, which the workshop does not serve, so it fails as a lost request does.
const Opened = ({
  name = 'Fixture Member',
  verified = true,
  pendingInvitations,
  failSignOut = false,
}: {
  name?: string;
  verified?: boolean;
  pendingInvitations?: number;
  failSignOut?: boolean;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.click();
    if (!failSignOut) return;
    const later = setTimeout(() => press('Sign Out'), 100);
    return () => clearTimeout(later);
  }, [failSignOut]);
  return (
    <div ref={ref}>
      <Right>
        <AccountMenu
          name={name}
          verified={verified}
          pendingInvitations={pendingInvitations}
          links={LINKS}
        />
      </Right>
    </div>
  );
};

// One control chooses the state, each a whole menu. Closed With Invitations
// shows the dot on the disc for two waiting invitations. Open With One
// Invitation reads "1 Coven Invitation". Open Unverified is Sign Out alone.
const STATES: Record<string, ReactNode> = {
  Closed: (
    <Right>
      <AccountMenu name="Fixture Member" verified />
    </Right>
  ),
  Open: <Opened />,
  'Closed With Invitations': (
    <Right>
      <AccountMenu name="Fixture Member" verified pendingInvitations={2} />
    </Right>
  ),
  'Open With Invitations': <Opened pendingInvitations={2} />,
  'Open With One Invitation': <Opened pendingInvitations={1} />,
  'Open On The Admin Page': (
    <WorkshopPathname.Provider value="/admin">
      <Opened />
    </WorkshopPathname.Provider>
  ),
  'Open With A Long Name': <Opened name="A Long Named Fixture Herbalist of the Circle" />,
  'Sign Out Failed': <Opened failSignOut />,
  'Open Unverified': <Opened verified={false} />,
};

export const States: Story = {
  args: { state: 'Closed' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
