import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import Welcome from '.';

// Render-only; behaviour is asserted in tests/components/Welcome. The page
// decides `landing` from the session; a story fixes it by hand. Every story
// sits in the page's real frame, `main.page-frame.welcome-page`, so the
// column it shows is the one `/` draws (claude-docs/workshop.md).
export default {
  title: 'Welcome',
};

const Page = ({ className, children }: { className?: string; children: ReactNode }) => (
  <main className={className ? `page-frame welcome-page ${className}` : 'page-frame welcome-page'}>
    {children}
  </main>
);

const SignedOut = (): ReactElement => (
  <Page>
    <Welcome />
  </Page>
);

// What every signed-out visitor sees at `/`.
export const Default: Story = () => <SignedOut />;

// The same page for a visitor with a live session: the way in is the landing.
export const SignedIn: Story = () => (
  <Page>
    <Welcome landing="/coven" />
  </Page>
);

// A phone's width, in each theme.
export const PhoneDark: Story = () => <SignedOut />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <SignedOut />;
PhoneLight.meta = { theme: 'light', width: 375 };

// MB.116's open call, side by side; the losing story is deleted at sign-off.
// The lede on the `.lede` primitive: body size, muted, as every section head's.
export const ProposalLedeBody: Story = () => <SignedOut />;

// Today's lede: 1.125rem in the body ink, a step above the paragraphs.
export const ProposalLedeLarge: Story = () => (
  <Page className="welcome-proposal--lede-large">
    <Welcome />
  </Page>
);
