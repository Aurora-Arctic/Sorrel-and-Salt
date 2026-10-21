import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import Welcome from '.';

// Render-only; behaviour is asserted in tests/components/Welcome. The page
// decides `landing` from the session; a story fixes it by hand. Every story
// sits in the page's real frame, `main.page-frame.welcome-page`, so the
// column it shows is the one `/` draws (claude-docs/workshop.md).
const meta = {
  title: 'Pages / Welcome',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Page = ({ children }: { children: ReactNode }) => (
  <main className="page-frame welcome-page">{children}</main>
);

const SignedOut = (): ReactElement => (
  <Page>
    <Welcome />
  </Page>
);

// What every signed-out visitor sees at `/`.
export const Default: Story = { render: () => <SignedOut /> };

// The same page for a visitor with a live session: the way in is the landing.
export const SignedIn: Story = {
  render: () => (
    <Page>
      <Welcome landing="/coven" />
    </Page>
  ),
};
