import type { Story } from '@ladle/react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import CovenNav from '.';

// Render-only; behaviour is asserted in tests/components/CovenNav. The
// workshop's `usePathname` stub answers whatever the wrapping provider says.
export default {
  title: 'CovenNav',
};

// On the coven index: Overview is the current link.
export const Default: Story = () => (
  <WorkshopPathname.Provider value="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" />
  </WorkshopPathname.Provider>
);

export const Phone: Story = () => (
  <WorkshopPathname.Provider value="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" />
  </WorkshopPathname.Provider>
);
Phone.meta = { width: 375 };
