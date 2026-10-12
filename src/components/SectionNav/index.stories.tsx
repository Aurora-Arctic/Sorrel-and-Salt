import type { Story } from '@ladle/react';
import { type ReactElement, type ReactNode } from 'react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import AdminNav from '../AdminNav';
import CovenNav from '../CovenNav';

// Render-only; behaviour is asserted in tests/components/SectionNav. The
// workshop's `usePathname` stub answers whatever the wrapping provider says.
// The shape is chosen by the window's width, so the narrow stories set the
// workshop's own width (`meta.width`) rather than a frame's.
export default {
  title: 'SectionNav',
};

// A stand-in for the context row the layouts put the nav in: a hairline-edged
// row of the row's height, the nav stretched along it. On a phone the nav
// leaves it for the foot of the window, and the page clears the bar.
const Row = ({ path, children }: { path: string; children: ReactNode }): ReactElement => (
  <WorkshopPathname.Provider value={path}>
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: '3.5rem',
        paddingInline: '1.5rem',
        borderBottom: '1px solid var(--hairline, gray)',
      }}
    >
      {children}
    </div>
    <p style={{ paddingBlockEnd: '5rem' }}>The page beneath the nav.</p>
  </WorkshopPathname.Provider>
);

// Wide: Grimoire-style tabs, with Overview current.
export const Coven: Story = () => (
  <Row path="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" />
  </Row>
);

// Wide: six tabs, a hairline between Astrology and People, Categories
// current (on its Groups tab's address).
export const Admin: Story = () => (
  <Row path="/admin/category-groups">
    <AdminNav />
  </Row>
);

// Tablet: the first four tabs, the rest behind More.
export const AdminTablet: Story = () => (
  <Row path="/admin/category-groups">
    <AdminNav />
  </Row>
);
AdminTablet.meta = { width: 700 };

// Tablet, on a page that is behind More: More names it and carries the mark.
export const AdminOnAHiddenPage: Story = () => (
  <Row path="/admin/users">
    <AdminNav />
  </Row>
);
AdminOnAHiddenPage.meta = { width: 700 };

// Phone: the bar along the foot of the window, in each theme.
export const AdminPhoneDark: Story = () => (
  <Row path="/admin/forms">
    <AdminNav />
  </Row>
);
AdminPhoneDark.meta = { theme: 'dark', width: 375 };

export const AdminPhoneLight: Story = () => (
  <Row path="/admin/forms">
    <AdminNav />
  </Row>
);
AdminPhoneLight.meta = { theme: 'light', width: 375 };

export const AdminPhoneOnAHiddenPage: Story = () => (
  <Row path="/admin/celestial-bodies">
    <AdminNav />
  </Row>
);
AdminPhoneOnAHiddenPage.meta = { width: 375 };

export const CovenPhone: Story = () => (
  <Row path="/coven/fixture-coven">
    <CovenNav slug="fixture-coven" />
  </Row>
);
CovenPhone.meta = { width: 375 };
