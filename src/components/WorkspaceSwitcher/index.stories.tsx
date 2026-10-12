import type { Story } from '@ladle/react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import WorkspaceSwitcher from '.';

// Render-only; behaviour is asserted in tests/components/WorkspaceSwitcher.
// The workshop's router goes nowhere, so a choice only closes the list.
export default {
  title: 'WorkspaceSwitcher',
};

const WORKSPACES = [
  { slug: 'fixture-coven', name: 'Fixture Coven' },
  { slug: 'testwort-circle', name: 'Testwort Circle' },
  { slug: 'my-own-grimoire', name: 'My Own Grimoire' },
];

// In a workspace: its name is the value.
export const InWorkspace: Story = () => (
  <WorkshopPathname.Provider value="/coven/testwort-circle/ingredients">
    <WorkspaceSwitcher workspaces={WORKSPACES} />
  </WorkshopPathname.Provider>
);

// Outside any workspace, on the account page: nothing chosen yet.
export const OutsideWorkspace: Story = () => (
  <WorkshopPathname.Provider value="/account">
    <WorkspaceSwitcher workspaces={WORKSPACES} />
  </WorkshopPathname.Provider>
);

export const Phone: Story = () => <InWorkspace />;
Phone.meta = { width: 375 };
