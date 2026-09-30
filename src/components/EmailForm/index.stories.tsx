import type { Story } from '@ladle/react';
import { verifyErrorMessage } from '../../lib/account-email';
import EmailForm from '.';
import type { EmailFormProps } from './types';

// Render-only; behaviour is asserted in tests/components/EmailForm. The
// component talks to the network only on submit, so nothing is mocked — a
// submit in the workshop fails into the alert region, which is itself a state
// worth seeing. The TanStack Query client `useMutation` needs comes from the
// workshop's global provider (.ladle/components.tsx), as it does from the
// app's root layout.
export default {
  title: 'Forms / Email',
};

// Inside the page's own frame, so the workshop shows what the page shows;
// nothing here is the workshop's alone.
const Page = (props: EmailFormProps) => (
  <main className="email-page">
    <EmailForm {...props} />
  </main>
);

// The common first visit: the provider shared an address, the sign-up mail
// has just gone, so the submit is counting the minute down.
export const Prefilled: Story = () => (
  <Page email="ada@example.test" verified={false} landing="/coven" waitSeconds={45} />
);

// The same visit once the minute has passed.
export const ReadyToResend: Story = () => (
  <Page email="ada@example.test" verified={false} landing="/coven" />
);

// A provider that shared no address: the field starts empty.
export const NoEmail: Story = () => <Page email="" verified={false} landing="/coven" />;

// A followed link's landing: the proved address and the way on, nothing to edit.
export const Confirmed: Story = () => (
  <Page email="ada@example.test" verified confirmed landing="/coven" />
);

// A verified account back to change its address: nothing to send until edited.
export const ChangeLater: Story = () => <Page email="ada@example.test" verified landing="/coven" />;

// `error` reads the real mapping rather than a copied string, so this story
// cannot go stale against src/lib/account-email.ts.
export const WithError: Story = () => (
  <Page
    email="ada@example.test"
    verified={false}
    landing="/coven"
    error={verifyErrorMessage('TOKEN_EXPIRED')}
  />
);
