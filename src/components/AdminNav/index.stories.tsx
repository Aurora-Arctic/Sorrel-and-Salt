import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { AdminFrame as Frame } from '../../../.storybook/admin-frame';
import { AdminContents } from '.';

// Render-only; behaviour is asserted in tests/components/AdminNav. It takes
// one prop, `managesPeople`: an admin sees every page, a curator all but
// People (M11.20). The workshop's `usePathname`
// stub answers `/admin/users` (.storybook/navigation.ts), the People page's
// Users tab, so People is the current page in every story. Each sits in the
// admin layout as it is (`AdminFrame`): the nav in the context row led by
// "Admin", above the `.page-column` column that holds the page.
const meta = {
  title: 'Admin / Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Wider than a tablet: six tabs along the row, People set apart by a hairline
// and marked by weight and the heavy rule. The narrower shapes are
// SectionNav's stories.
const defaultNode = <Frame />;

// A curator's nav: the five curation pages, and no People. Opened on the
// compendium, since a curator never reaches the People page.
const curatorNode = <Frame open="/admin/compendium" managesPeople={false} />;

// The `/admin` index under the nav: a lede, then the table of contents in
// the nav's sections. The page is a server component behind the guard, so
// its heading and lede are copied here; the contents are the real part.
const Index = ({ managesPeople = true }: { managesPeople?: boolean }): ReactElement => (
  <Frame managesPeople={managesPeople}>
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

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Curator: curatorNode,
  'Index Page': indexPageNode,
  'Index Page Curator': indexPageCuratorNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
