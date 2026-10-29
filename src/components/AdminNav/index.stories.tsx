import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { AdminFrame as Frame } from '../../../.storybook/admin-frame';
import { AdminContents } from '.';

// Render-only; behaviour is asserted in tests/components/AdminNav. `managesPeople`
// is the one prop. The workshop's `usePathname` stub answers `/admin/users`
// (.storybook/navigation.ts), so People is current. Each story sits in `AdminFrame`.
const meta = {
  title: 'Admin / Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// Wider than a tablet: six tabs along the row, People set apart by a hairline
// and marked by weight and the heavy rule. The narrower shapes are
// SectionNav's stories.
const defaultNode = <Frame />;

// Other pages current: the nav marks whichever page the address belongs to.
const categoriesCurrentNode = <Frame open="/admin/category-groups" />;

const astrologyCurrentNode = <Frame open="/admin/zodiac-signs" />;

const invitationsCurrentNode = <Frame open="/admin/invitations" />;

// A curator's nav: the five curation pages, and no People. Opened on the
// compendium, since a curator never reaches the People page.
const curatorNode = <Frame open="/admin/compendium" managesPeople={false} />;

// The `/admin` index under the nav: a lede, then the contents in the nav's
// sections. The page is a server component, so its heading and lede are copied
// here. Opened at `/admin`, where no page is current.
const Index = ({ managesPeople = true }: { managesPeople?: boolean }): ReactElement => (
  <Frame shell open="/admin" managesPeople={managesPeople}>
    <main>
      <h1>Admin</h1>
      <p className="lede">
        Here you curate what every coven reads from
        {managesPeople && ', and manage who uses the site'}. Pick a page below, or from the admin
        links at the top of any admin page.
      </p>
      <AdminContents managesPeople={managesPeople} />
    </main>
  </Frame>
);

const indexPageNode = <Index />;

// The index as a curator reads it: the Compendium section alone.
const indexPageCuratorNode = <Index managesPeople={false} />;

const STATES: Record<string, ReactNode> = {
  'People Current': defaultNode,
  'Categories Current': categoriesCurrentNode,
  'Astrology Current': astrologyCurrentNode,
  'Invitations Current': invitationsCurrentNode,
  Curator: curatorNode,
  'Index Page': indexPageNode,
  'Index Page Curator': indexPageCuratorNode,
};

export const States: Story = {
  args: { state: 'People Current' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};

// Narrow, where the nav moves to the bar at the foot of the window. Its own
// story: a width is pinned for the whole story, not for a state.
export const NarrowPinned: Story = {
  render: () => <Frame open="/admin/compendium" />,
  globals: { viewport: { value: 'w375', isRotated: false } },
};
