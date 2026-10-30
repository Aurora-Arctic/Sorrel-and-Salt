import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { verifyErrorMessage } from '../../lib/account-email';
import EmailForm from '.';
import type { EmailFormProps } from './types';

// Render-only; behaviour is asserted in tests/components/EmailForm. Nothing is
// mocked: a submit fails into the alert region. The TanStack Query client comes
// from the workshop's global provider (.storybook/components.tsx).
const meta = {
  title: 'Account / Email Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// The app shell, then the page's own frame and panel: the header with the
// account's initials at phone width, and an unverified account's header without
// Add Ingredient. The shell's viewer is verified when the address is.
const Page = (props: EmailFormProps) => (
  <ShellFrame area="none" viewer={{ verified: props.verified }} open="/account/email">
    <main className="page-frame page-frame--narrow">
      <div className="panel">
        <EmailForm {...props} />
      </div>
    </main>
  </ShellFrame>
);

// The common first visit once the minute has passed: the provider shared an
// address, the sign-up mail went a while ago, so Send Confirmation is usable.
const readyToResendNode = <Page email="ada@example.test" verified={false} landing="/coven" />;

// The same visit within the minute after a mail: the submit counts it down.
const countdownNode = (
  <Page email="ada@example.test" verified={false} landing="/coven" waitSeconds={45} />
);

// A provider that shared no address: the field starts empty.
const noEmailNode = <Page email="" verified={false} landing="/coven" />;

// A followed link's landing: the proved address and the way on, nothing to edit.
const confirmedNode = (
  <Page email="ada@example.test" verified confirmed landing="/coven" accountPath="/account" />
);

// A verified account back to change its address: nothing to send until edited.
const changeLaterNode = (
  <Page email="ada@example.test" verified landing="/coven" accountPath="/account" />
);

// `error` reads the real mapping rather than a copied string, so this story
// cannot go stale against src/lib/account-email.ts.
const failedNode = (
  <Page
    email="ada@example.test"
    verified={false}
    landing="/coven"
    error={verifyErrorMessage('TOKEN_EXPIRED')}
  />
);

// The account page's Email section: the section heads it, so the
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

const STATES: Record<string, ReactNode> = {
  'Ready To Resend': readyToResendNode,
  Countdown: countdownNode,
  'No Email': noEmailNode,
  Confirmed: confirmedNode,
  'Change Later': changeLaterNode,
  Failed: failedNode,
};

export const States: Story = {
  args: { state: 'Ready To Resend' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
