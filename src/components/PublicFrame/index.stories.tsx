import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { Navigating } from '../../../.storybook/navigating';
import { WorkshopPathname } from '../../../.storybook/navigation';
import PublicFrame from '.';

const meta = {
  title: 'Shell / Public Frame',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Page = ({ open = '/compendium' }: { open?: string }): ReactElement => (
  <WorkshopPathname.Provider value={open}>
    <PublicFrame configured={['discord', 'google', 'facebook', 'microsoft']}>
      <main>
        <div className="page-column">
          <h1>Compendium</h1>
        </div>
      </main>
    </PublicFrame>
  </WorkshopPathname.Provider>
);

const defaultNode = <Page />;

const notOnTheCompendiumNode = <Page open="/" />;

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
  render: ({ state }) => <div>{state}</div>,
};
