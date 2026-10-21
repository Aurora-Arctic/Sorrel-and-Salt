import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkshopPathname } from '../../../.storybook/navigation';
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

// In a workspace: its name is the value.
const InWorkspaceView = () => (
  <WorkshopPathname.Provider value="/coven/testwort-circle/ingredients">
    <WorkspaceSwitcher workspaces={WORKSPACES} />
  </WorkshopPathname.Provider>
);

export const Default: Story = { render: InWorkspaceView };

// Outside any workspace, on the account page: nothing chosen yet.
export const OutsideWorkspace: Story = {
  render: () => (
    <WorkshopPathname.Provider value="/account">
      <WorkspaceSwitcher workspaces={WORKSPACES} />
    </WorkshopPathname.Provider>
  ),
};

// A viewer holding creation rights: the list ends with Create Coven (M9.16).
export const CanCreate: Story = {
  render: () => (
    <WorkshopPathname.Provider value="/coven/testwort-circle">
      <WorkspaceSwitcher workspaces={WORKSPACES} canCreate />
    </WorkshopPathname.Provider>
  ),
};
