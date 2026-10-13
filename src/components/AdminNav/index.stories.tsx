import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { AdminFrame as Frame } from '../../../.ladle/admin-frame';
import { AdminContents } from '.';

// Render-only; behaviour is asserted in tests/components/AdminNav. It takes
// no props: every admin sees the same pages. The workshop's `usePathname`
// stub answers `/admin/users` (.ladle/navigation.ts), the People page's
// Users tab, so People is the current page in every story. Each sits in the
// admin layout as it is (`AdminFrame`): the nav in the context row led by
// "Admin", above the `.admin-layout` column that holds the page.
export default {
  title: 'Admin / Admin Nav',
};

// Wider than a tablet: six tabs along the row, People set apart by a hairline
// and marked by weight and the heavy rule. The narrower shapes are
// SectionNav's stories.
export const Default: Story = () => <Frame />;

export const Phone: Story = () => <Frame />;
Phone.meta = { width: 375 };

// The `/admin` index under the nav: a lede, then the table of contents in
// the nav's sections. The page is a server component behind the guard, so
// its heading and lede are copied here; the contents are the real part.
const Index = (): ReactElement => (
  <Frame>
    <main>
      <h1>Admin</h1>
      <p className="lede">
        Here you curate what every coven reads from, and manage who uses the site. Pick a page
        below, or from the admin links at the top of any admin page.
      </p>
      <AdminContents />
    </main>
  </Frame>
);

export const IndexPage: Story = () => <Index />;

export const IndexPagePhone: Story = () => <Index />;
IndexPagePhone.meta = { width: 375 };
