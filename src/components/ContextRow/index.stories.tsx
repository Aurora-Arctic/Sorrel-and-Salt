import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkshopPathname } from '../../../.storybook/navigation';
import { StatesGrid } from '../../../.storybook/states-grid';
import AdminNav from '../AdminNav';
import CovenNav from '../CovenNav';
import WorkspaceSwitcher from '../WorkspaceSwitcher';
import ContextRow from '.';

// Render-only; behaviour is asserted in tests/components/ContextRow.
const meta = {
  title: 'Shell / Context Row',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const WORKSPACES = [
  { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true, canInvite: true },
  { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: true, canInvite: true },
];

// The admin area's row: the word "Admin" in the display face, the nav beside it. A coven's row:
// the switcher is the lead, the coven's nav beside it, as a member sees it (Overview and Members).
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="40rem"
      states={{
        Admin: (
          <ContextRow lead={<span className="context-row__name">Admin</span>}>
            <AdminNav managesPeople />
          </ContextRow>
        ),
        Coven: (
          <WorkshopPathname.Provider value="/coven/fixture-coven">
            <ContextRow lead={<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />}>
              <CovenNav slug="fixture-coven" canReadMembers />
            </ContextRow>
          </WorkshopPathname.Provider>
        ),
        'Long Workspace Name': (
          <WorkshopPathname.Provider value="/coven/long">
            <ContextRow
              lead={
                <WorkspaceSwitcher
                  workspaces={[
                    {
                      slug: 'long',
                      name: 'A Long Named Circle of Fixture Herbalists',
                      canReadMembers: true,
                      canInvite: true,
                    },
                  ]}
                />
              }
            />
          </WorkshopPathname.Provider>
        ),
      }}
    />
  ),
};
