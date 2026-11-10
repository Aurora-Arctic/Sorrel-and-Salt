import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useEffect } from 'react';
import SignInDialog from '.';
import type { SignInDialogProps } from './types';

const meta = {
  title: 'Sign In / Dialog',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const ALL_PROVIDERS = ['discord', 'google', 'facebook', 'microsoft'] as const;

const INVITATION_LEDES = {
  'sign-in': 'Use the account whose email address this invitation was sent to.',
  'sign-up': 'Use the email address this invitation was sent to.',
};

// The trigger is a link, which the workshop's `press` does not look for, so the story presses it
// here, as a person would.
const Opened = ({ label, ...props }: SignInDialogProps): ReactElement => {
  useEffect(() => {
    [...document.querySelectorAll<HTMLAnchorElement>('a')]
      .find((link) => link.textContent === label)
      ?.click();
  }, [label]);
  return <SignInDialog label={label} {...props} />;
};

export const Closed: Story = {
  render: () => <SignInDialog next="/compendium" configured={ALL_PROVIDERS} label="Sign In" />,
};

export const SignInFromTheBar: Story = {
  render: () => <Opened next="/compendium" configured={ALL_PROVIDERS} label="Sign In" />,
};

export const CreateAnAccountFromAnInvitation: Story = {
  render: () => (
    <Opened
      next="/invite/abc"
      configured={ALL_PROVIDERS}
      label="Create Account"
      className="btn btn--solid"
      mode="sign-up"
      ledes={INVITATION_LEDES}
      signUpLandsOnNext
    />
  ),
};
