import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, type ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { WorkshopPathname } from '../../../.storybook/navigation';
import AdminNav from '../AdminNav';
import CovenNav from '../CovenNav';

// Render-only; behaviour is asserted in tests/components/SectionNav. The
// workshop's `usePathname` stub answers whatever the wrapping provider says.
// The shape is chosen by the window's width, so the narrow stories set the
// workshop's own width (`meta.width`) rather than a frame's.
const meta = {
  title: 'Navigation / Section Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// A stand-in for the context row the layouts put the nav in: a hairline-edged
// row of the row's height, the nav stretched along it. On a phone the nav
// leaves it for the foot of the window, and the page clears the bar.
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

// Wide: the tabs a member sees, then a viewer's (no Members), then the admin's
// six tabs with a hairline between Astrology and People.
const SECTION_STATES: Record<string, ReactNode> = {
  'Coven Overview Current': coven('/coven/fixture-coven', true),
  'Coven Ingredients Current': coven('/coven/fixture-coven/ingredients', true),
  'Coven Members Current': coven('/coven/fixture-coven/members', true),
  'Coven As A Viewer': coven('/coven/fixture-coven', false),
  'Admin Categories Current': admin('/admin/category-groups'),
  'Admin Compendium Current': admin('/admin/compendium'),
  'Admin Astrology Current': admin('/admin/zodiac-signs'),
  'Admin People Current': admin('/admin/users'),
  'Admin As A Curator': admin('/admin/compendium', false),
};

export const States: Story = {
  args: { state: 'Coven Overview Current' },
  argTypes: {
    state: { control: 'select', options: Object.keys(SECTION_STATES), mapping: SECTION_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};

// Tablet, on a page that is behind More: More names it and carries the mark. The
// width stays pinned (700px) because this state exists only at tablet width: wider
// shows every link, narrower moves the nav to the bottom bar.
export const AdminOnAHiddenPage: Story = {
  render: () => admin('/admin/users'),
  globals: { viewport: { value: 'w700', isRotated: false } },
};

// Tablet with More pressed: the links behind it in a sheet.
const MoreOpen = ({ path }: { path: string }): ReactElement => {
  usePressOnMount('More');
  return admin(path);
};

export const TabletMoreOpen: Story = {
  render: () => <MoreOpen path="/admin/compendium" />,
  globals: { viewport: { value: 'w700', isRotated: false } },
};

// A phone: the nav leaves the row for the bar at the foot of the window.
export const PhoneBottomBar: Story = {
  render: () => coven('/coven/fixture-coven', true),
  globals: { viewport: { value: 'w375', isRotated: false } },
};

export const PhoneAdminBottomBar: Story = {
  render: () => admin('/admin/compendium'),
  globals: { viewport: { value: 'w375', isRotated: false } },
};

export const PhoneMoreOpen: Story = {
  render: () => <MoreOpen path="/admin/compendium" />,
  globals: { viewport: { value: 'w375', isRotated: false } },
};
