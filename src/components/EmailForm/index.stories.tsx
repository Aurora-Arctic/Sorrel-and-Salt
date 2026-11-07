import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { verifyErrorMessage } from '../../lib/account-email';
import EmailForm from '.';
import type { EmailFormProps } from './types';

const meta = {
  title: 'Account / Email Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Page = (props: EmailFormProps) => (
  <ShellFrame area="none" viewer={{ verified: props.verified }} open="/account/email">
    <main className="page-frame page-frame--narrow">
      <div className="panel">
        <EmailForm {...props} />
      </div>
    </main>
  </ShellFrame>
);

const readyToResendNode = <Page email="ada@example.test" verified={false} landing="/coven" />;

const countdownNode = (
  <Page email="ada@example.test" verified={false} landing="/coven" waitSeconds={45} />
);

const noEmailNode = <Page email="" verified={false} landing="/coven" />;

const confirmedNode = (
  <Page email="ada@example.test" verified confirmed landing="/coven" accountPath="/account" />
);

const changeLaterNode = (
  <Page email="ada@example.test" verified landing="/coven" accountPath="/account" />
);

const failedNode = (
  <Page
    email="ada@example.test"
    verified={false}
    landing="/coven"
    error={verifyErrorMessage('TOKEN_EXPIRED')}
  />
);

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
