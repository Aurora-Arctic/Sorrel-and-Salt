import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { Navigating } from '../../../.storybook/navigating';
import { WorkshopPathname } from '../../../.storybook/navigation';
import PublicFrame from '.';

// Render-only; behaviour is asserted in tests/components/PublicFrame. The frame
// takes only the page, so each story fills it with a heading
// (claude-docs/workshop.md).
const meta = {
  title: 'Shell / Public Frame',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// The workshop pretends to be on the admin area unless told otherwise, so each
// story says where the page is: the nav marks the Compendium link as current
// at or beneath /compendium.
const Page = ({ open = '/compendium' }: { open?: string }): ReactElement => (
  <WorkshopPathname.Provider value={open}>
    <PublicFrame>
      <main>
        <div className="page-column">
          <h1>Compendium</h1>
        </div>
      </main>
    </PublicFrame>
  </WorkshopPathname.Provider>
);

const defaultNode = <Page />;

// The bar on a page the nav does not name, so the Compendium link rests unmarked.
const notOnTheCompendiumNode = <Page open="/" />;

// Mid-wait: the nav's Compendium link already pressed, on an entry's page, so
// the page has gone and the Compendium's cards stand in the frame's body
// under the bar. The wait never ends here; "Start Over" ends it.
export const LoadingTheCompendium: Story = {
  render: () => (
    <Navigating press="Compendium">
      <Page open="/compendium/ingredients/testwort" />
    </Navigating>
  ),
};

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Not On The Compendium': notOnTheCompendiumNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
