import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkshopPathname } from '../../../.storybook/navigation';
import { StatesGrid } from '../../../.storybook/states-grid';
import WorkspaceSwitcher from '.';

const meta = {
  title: 'Coven / Coven Switcher',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const WORKSPACES = [
  {
    slug: 'fixture-coven',
    name: 'Fixture Coven',
    canReadMembers: true,
    canInvite: true,
    paused: null,
  },
  {
    slug: 'testwort-circle',
    name: 'Testwort Circle',
    canReadMembers: true,
    canInvite: true,
    paused: null,
  },
  {
    slug: 'my-own-grimoire',
    name: 'My Own Grimoire',
    canReadMembers: true,
    canInvite: true,
    paused: null,
  },
];

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="16rem"
      states={{
        'In Workspace': (
          <WorkshopPathname.Provider value="/coven/testwort-circle/ingredients">
            <WorkspaceSwitcher workspaces={WORKSPACES} />
          </WorkshopPathname.Provider>
        ),
        'Outside Workspace': (
          <WorkshopPathname.Provider value="/account">
            <WorkspaceSwitcher workspaces={WORKSPACES} />
          </WorkshopPathname.Provider>
        ),
        'Can Create': (
          <WorkshopPathname.Provider value="/coven/testwort-circle">
            <WorkspaceSwitcher workspaces={WORKSPACES} canCreate />
          </WorkshopPathname.Provider>
        ),
      }}
    />
  ),
};
