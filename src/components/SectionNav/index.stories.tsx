import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { type ReactElement, type ReactNode } from 'react';
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
type Story = StoryObj<typeof meta>;

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

// Wide: Grimoire-style tabs, as a member sees them (Overview and Members),
// with Overview current.
const defaultNode = (
  <Row path="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" canReadMembers />
  </Row>
);

// Wide: six tabs, a hairline between Astrology and People, Categories
// current (on its Groups tab's address).
const adminNode = (
  <Row path="/admin/category-groups">
    <AdminNav managesPeople />
  </Row>
);

// Tablet, on a page that is behind More: More names it and carries the mark. The
// width stays pinned (700px) because this state exists only at tablet width: wider
// shows every link, narrower moves the nav to the bottom bar.
export const AdminOnAHiddenPage: Story = {
  render: () => (
    <Row path="/admin/users">
      <AdminNav managesPeople />
    </Row>
  ),
  globals: { viewport: { value: 'w700', isRotated: false } },
};

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Admin: adminNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
