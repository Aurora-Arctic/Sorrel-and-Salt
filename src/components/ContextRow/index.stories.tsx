import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkshopPathname } from '../../../.storybook/navigation';
import { PendingLink } from '../../lib/navigation';
import { StatesGrid } from '../../../.storybook/states-grid';
import AdminNav from '../AdminNav';
import CovenNav from '../CovenNav';
import WorkspaceSwitcher from '../WorkspaceSwitcher';
import ContextRow from '.';

const meta = {
  title: 'Shell / Context Row',
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
];

const SOLE = [WORKSPACES[0]];

const AdminName = () => (
  <PendingLink href="/keepers" className="context-row__name">
    Admin
  </PendingLink>
);

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
                      paused: null,
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
