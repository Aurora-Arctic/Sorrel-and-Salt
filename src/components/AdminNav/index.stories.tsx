import type { Story } from '@ladle/react';
import { type ReactElement, useEffect, useRef } from 'react';
import { AdminFrame as Frame } from '../../../.ladle/admin-frame';
import AdminNav, { AdminContents } from '.';

// Render-only; behaviour is asserted in tests/components/AdminNav. It takes
// no props: every admin sees the same pages. The workshop's `usePathname`
// stub answers `/admin/users` (.ladle/navigation.ts), the People page's
// Users tab, so People is the current page in every story. Each sits in the layout's real frame,
// `.admin-layout`.
export default {
  title: 'AdminNav',
};

// Wider than a phone: the wrapping row, People marked by weight and an
// offset underline.
export const Default: Story = () => (
  <Frame>
    <AdminNav />
  </Frame>
);

// A phone's width, in each theme: the disclosure, shut, saying where you are.
export const PhoneDark: Story = () => (
  <Frame>
    <AdminNav />
  </Frame>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <Frame>
    <AdminNav />
  </Frame>
);
PhoneLight.meta = { theme: 'light', width: 375 };

// The disclosure open, its sections beneath it, opened once on mount as a
// press on it would.
const OpenMenu = (): ReactElement => {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    frame.current?.querySelector('details')?.setAttribute('open', '');
  }, []);
  return (
    <div ref={frame}>
      <Frame>
        <AdminNav />
      </Frame>
    </div>
  );
};

export const PhoneOpen: Story = () => <OpenMenu />;
PhoneOpen.meta = { width: 375 };

// The `/admin` index under the nav: a lede, then the table of contents in
// the nav's sections. The page is a server component behind the guard, so
// its heading and lede are copied here; the contents are the real part.
const Index = (): ReactElement => (
  <Frame>
    <AdminNav />
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
