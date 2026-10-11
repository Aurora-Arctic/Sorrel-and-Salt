import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import NotAuthorized from '.';

// Render-only; behaviour is asserted in tests/components/NotAuthorized. It
// takes no props: every signed-in non-admin sees the same page. Every story
// sits in the page's real frame, `forbidden.tsx`'s `main.page-frame`
// (claude-docs/workshop.md).
export default {
  title: 'Not Authorized',
};

const Page = (): ReactElement => (
  <main className="page-frame">
    <NotAuthorized />
  </main>
);

export const Default: Story = () => <Page />;

// A phone's width, in each theme.
export const PhoneDark: Story = () => <Page />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Page />;
PhoneLight.meta = { theme: 'light', width: 375 };
