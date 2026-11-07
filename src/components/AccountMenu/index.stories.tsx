import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, type ReactNode, useEffect, useRef } from 'react';
import AccountMenu from '.';
import { WorkshopPathname } from '../../../.storybook/navigation';
import { press } from '../../../.storybook/press';
import { route } from '../../../.storybook/route';

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
  { label: 'Keepers', href: '/keepers' as const, base: '/keepers' },
];

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
    <WorkshopPathname.Provider value="/keepers">
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
  render: ({ state }) => <div>{state}</div>,
};
