import type { Story } from '@ladle/react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import CovenNav from '.';

// Render-only; behaviour is asserted in tests/components/CovenNav. The
// workshop's `usePathname` stub answers whatever the wrapping provider says.
export default {
  title: 'CovenNav',
};

// On the coven index, as a member sees it: Overview is the current section,
// Members beside it. The shapes the nav takes by width are SectionNav's stories.
export const Default: Story = () => (
  <WorkshopPathname.Provider value="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" canReadMembers />
  </WorkshopPathname.Provider>
);

// As a viewer sees it: their role may not read the members, so no Members.
export const Viewer: Story = () => (
  <WorkshopPathname.Provider value="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" />
  </WorkshopPathname.Provider>
);

export const Phone: Story = () => (
  <WorkshopPathname.Provider value="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" canReadMembers />
  </WorkshopPathname.Provider>
);
Phone.meta = { width: 375 };
