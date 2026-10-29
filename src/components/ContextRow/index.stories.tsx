import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkshopPathname } from '../../../.storybook/navigation';
import { adminTarget } from '../AdminNav/target';
import { PendingLink } from '../../lib/navigation';
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

const SOLE = [WORKSPACES[0]];

const AdminName = () => (
  <PendingLink href="/admin" className="context-row__name" navigationTarget={adminTarget('/admin')}>
    Admin
  </PendingLink>
);

// Admin row: "Admin" home link, then the nav (an admin's ends with People). Coven
// row: the switcher leads, then the coven's nav (a viewer's has no Members). The
// zero-coven row is the switcher alone, with only Create Coven to choose.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="40rem"
      states={{
        Admin: (
          <ContextRow lead={<AdminName />}>
            <AdminNav managesPeople />
          </ContextRow>
        ),
        Curator: (
          <ContextRow lead={<AdminName />}>
            <AdminNav managesPeople={false} />
          </ContextRow>
        ),
        Coven: (
          <WorkshopPathname.Provider value="/coven/fixture-coven">
            <ContextRow lead={<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />}>
              <CovenNav slug="fixture-coven" canReadMembers />
            </ContextRow>
          </WorkshopPathname.Provider>
        ),
        "Viewer's Coven": (
          <WorkshopPathname.Provider value="/coven/fixture-coven">
            <ContextRow lead={<WorkspaceSwitcher workspaces={SOLE} />}>
              <CovenNav slug="fixture-coven" canReadMembers={false} />
            </ContextRow>
          </WorkshopPathname.Provider>
        ),
        'No Covens': (
          <WorkshopPathname.Provider value="/coven/new">
            <ContextRow lead={<WorkspaceSwitcher workspaces={[]} canCreate />} />
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
