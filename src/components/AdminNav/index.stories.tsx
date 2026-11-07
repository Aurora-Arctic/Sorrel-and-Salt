import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { AdminFrame as Frame } from '../../../.storybook/admin-frame';
import { AdminContents } from '.';

const meta = {
  title: 'Admin / Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const defaultNode = <Frame />;

const categoriesCurrentNode = <Frame open="/curator/category-groups" />;

const astrologyCurrentNode = <Frame open="/curator/zodiac-signs" />;

const invitationsCurrentNode = <Frame open="/keepers/invitations" />;

const curatorNode = <Frame open="/curator/compendium" managesPeople={false} />;

const Index = ({ managesPeople = true }: { managesPeople?: boolean }): ReactElement => (
  <Frame shell open="/keepers" managesPeople={managesPeople}>
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
  render: ({ state }) => <div>{state}</div>,
};

export const NarrowPinned: Story = {
  render: () => <Frame open="/curator/compendium" />,
  globals: { viewport: { value: 'w375', isRotated: false } },
};
