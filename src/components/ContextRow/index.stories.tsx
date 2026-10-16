import type { Story } from '@ladle/react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import AdminNav from '../AdminNav';
import CovenNav from '../CovenNav';
import WorkspaceSwitcher from '../WorkspaceSwitcher';
import ContextRow from '.';

// Render-only; behaviour is asserted in tests/components/ContextRow.
export default {
  title: 'Shell / Context Row',
};

const WORKSPACES = [
  { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true },
  { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: true },
];

// The admin area's row: the word "Admin" in the display face, the nav beside it.
export const Admin: Story = () => (
  <ContextRow lead={<span className="context-row__name">Admin</span>}>
    <AdminNav managesPeople />
  </ContextRow>
);

// A coven's row: the switcher is the lead, the coven's nav beside it, as a
// member sees it (Overview and Members).
export const Coven: Story = () => (
  <WorkshopPathname.Provider value="/coven/fixture-coven">
    <ContextRow lead={<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />}>
      <CovenNav slug="fixture-coven" canReadMembers />
    </ContextRow>
  </WorkshopPathname.Provider>
);

// A phone's width: the lead alone, at a control's height.
export const Phone: Story = () => <Coven />;
Phone.meta = { width: 375 };

export const PhoneLongName: Story = () => (
  <WorkshopPathname.Provider value="/coven/long">
    <ContextRow
      lead={
        <WorkspaceSwitcher
          workspaces={[
            {
              slug: 'long',
              name: 'A Long Named Circle of Fixture Herbalists',
              canReadMembers: true,
            },
          ]}
        />
      }
    />
  </WorkshopPathname.Provider>
);
PhoneLongName.meta = { width: 375 };
