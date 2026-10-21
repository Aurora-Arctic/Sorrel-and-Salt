import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { verifyErrorMessage } from '../../lib/account-email';
import EmailForm from '.';
import type { EmailFormProps } from './types';

// Render-only; behaviour is asserted in tests/components/EmailForm. The
// component talks to the network only on submit, so nothing is mocked — a
// submit in the workshop fails into the alert region, which is itself a state
// worth seeing. The TanStack Query client `useMutation` needs comes from the
// workshop's global provider (.storybook/components.tsx), as it does from the
// app's root layout.
const meta = {
  title: 'Account / Email Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Inside the page's own frame and panel, so the workshop shows what the page
// shows; nothing here is the workshop's alone.
const Page = (props: EmailFormProps) => (
  <main className="page-frame page-frame--narrow">
    <div className="panel">
      <EmailForm {...props} />
    </div>
  </main>
);

// The common first visit: the provider shared an address, the sign-up mail
// has just gone, so the submit is counting the minute down.
export const Default: Story = {
  render: () => (
    <Page email="ada@example.test" verified={false} landing="/coven" waitSeconds={45} />
  ),
};

// The same visit once the minute has passed.
export const ReadyToResend: Story = {
  render: () => <Page email="ada@example.test" verified={false} landing="/coven" />,
};

// A provider that shared no address: the field starts empty.
export const NoEmail: Story = { render: () => <Page email="" verified={false} landing="/coven" /> };

// A followed link's landing: the proved address and the way on, nothing to edit.
export const Confirmed: Story = {
  render: () => (
    <Page email="ada@example.test" verified confirmed landing="/coven" accountPath="/account" />
  ),
};

// A verified account back to change its address: nothing to send until edited.
export const ChangeLater: Story = {
  render: () => <Page email="ada@example.test" verified landing="/coven" accountPath="/account" />,
};

// `error` reads the real mapping rather than a copied string, so this story
// cannot go stale against src/lib/account-email.ts.
export const Failed: Story = {
  render: () => (
    <Page
      email="ada@example.test"
      verified={false}
      landing="/coven"
      error={verifyErrorMessage('TOKEN_EXPIRED')}
    />
  ),
};

// The account page's Email section (MB.88): the section heads it, so the
// form has no heading of its own, and it never shows the confirmed view.
export const Embedded: Story = {
  render: () => (
    <main className="page-frame page-frame--narrow">
      <section className="page-frame__section panel" aria-labelledby="email-story-heading">
        <div className="header">
          <h2 id="email-story-heading">Email</h2>
        </div>
        <EmailForm embedded email="ada@example.test" verified landing="/coven" />
      </section>
    </main>
  ),
};
