import type { Story } from '@ladle/react';
import Link from 'next/link';
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

// MB.116's open call, side by side; the losing story is deleted at sign-off.
// The way back as today's plain text link: the page's only action, and
// nothing about it primary.
export const ProposalWayBackLink: Story = () => <Page />;

// The way back as an outline `.btn` anchor, a target the size of every other
// page's action. The component's own markup with that one change, copied here
// so the proposal touches nothing the app ships.
export const ProposalWayBackButton: Story = () => (
  <main className="page-frame">
    <div className="not-authorized">
      <div className="header">
        <h1 className="not-authorized__title">Not Authorized</h1>
        <p className="not-authorized__reason lede">
          This part of Sorrel &amp; Salt is where the site&rsquo;s admins curate the shared
          compendium, and your account does not have admin rights.
        </p>
      </div>
      <p className="not-authorized__way-back">
        <Link className="btn" href="/">
          Back to Sorrel &amp; Salt
        </Link>
      </p>
    </div>
  </main>
);
