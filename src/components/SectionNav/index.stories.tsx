import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, type ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { WorkshopPathname } from '../../../.storybook/navigation';
import AdminNav from '../AdminNav';
import CovenNav from '../CovenNav';

const meta = {
  title: 'Navigation / Section Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Row = ({ path, children }: { path: string; children: ReactNode }): ReactElement => (
  <WorkshopPathname.Provider value={path}>
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: '3.5rem',
        paddingInline: '1.5rem',
        borderBottom: '1px solid var(--hairline, gray)',
      }}
    >
      {children}
    </div>
    <p style={{ paddingBlockEnd: '5rem' }}>The page beneath the nav.</p>
  </WorkshopPathname.Provider>
);

const coven = (path: string, canReadMembers: boolean) => (
  <Row path={path}>
    <CovenNav slug="fixture-coven" canReadMembers={canReadMembers} />
  </Row>
);

const admin = (path: string, managesPeople = true) => (
  <Row path={path}>
    <AdminNav managesPeople={managesPeople} />
  </Row>
);

const SECTION_STATES: Record<string, ReactNode> = {
  'Coven Overview Current': coven('/coven/fixture-coven', true),
  'Coven Ingredients Current': coven('/coven/fixture-coven/ingredients', true),
  'Coven Members Current': coven('/coven/fixture-coven/members', true),
  'Coven As A Viewer': coven('/coven/fixture-coven', false),
  'Admin Categories Current': admin('/curator/category-groups'),
  'Admin Compendium Current': admin('/curator/compendium'),
  'Admin Astrology Current': admin('/curator/zodiac-signs'),
  'Admin People Current': admin('/keepers/users'),
  'Admin As A Curator': admin('/curator/compendium', false),
};

export const States: Story = {
  args: { state: 'Coven Overview Current' },
  argTypes: {
    state: { control: 'select', options: Object.keys(SECTION_STATES), mapping: SECTION_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};

export const AdminOnAHiddenPage: Story = {
  render: () => admin('/keepers/users'),
  globals: { viewport: { value: 'w700', isRotated: false } },
};

const MoreOpen = ({ path }: { path: string }): ReactElement => {
  usePressOnMount('More');
  return admin(path);
};

export const TabletMoreOpen: Story = {
  render: () => <MoreOpen path="/curator/compendium" />,
  globals: { viewport: { value: 'w700', isRotated: false } },
};

export const PhoneBottomBar: Story = {
  render: () => coven('/coven/fixture-coven', true),
  globals: { viewport: { value: 'w375', isRotated: false } },
};

export const PhoneAdminBottomBar: Story = {
  render: () => admin('/curator/compendium'),
  globals: { viewport: { value: 'w375', isRotated: false } },
};

export const PhoneMoreOpen: Story = {
  render: () => <MoreOpen path="/curator/compendium" />,
  globals: { viewport: { value: 'w375', isRotated: false } },
};
