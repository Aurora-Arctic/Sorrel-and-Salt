import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkshopPathname } from '../../../.storybook/navigation';
import { StatesGrid } from '../../../.storybook/states-grid';
import WorkspaceSwitcher from '.';

// Render-only; behaviour is asserted in tests/components/WorkspaceSwitcher.
// The workshop's router goes nowhere, so a choice only closes the list.
const meta = {
  title: 'Coven / Coven Switcher',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const WORKSPACES = [
  { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true, canInvite: true },
  { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: true, canInvite: true },
  { slug: 'my-own-grimoire', name: 'My Own Grimoire', canReadMembers: true, canInvite: true },
];

// In a workspace: its name is the value. Outside any workspace, on the account page: nothing chosen
// yet. Can Create: a viewer holding creation rights, so the list ends with Create Coven.
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
        'Demo Coven': (
          <WorkshopPathname.Provider value="/coven/testwort-circle">
            <WorkspaceSwitcher
              workspaces={WORKSPACES.map((workspace) => ({
                ...workspace,
                demo: workspace.slug === 'testwort-circle',
              }))}
            />
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
