import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { emailChangeNoticeMessage } from './email-change-notice';

// Render-only; content is asserted in tests/emails/email-change-notice.test.tsx. The time and
// domain are invented.
const meta = {
  title: 'Emails / Email Change Notice',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const AT = new Date('2026-10-30T14:05:00Z');

// Module-level, so each story hands the preview the same function every render.
const requested = () =>
  emailChangeNoticeMessage({
    to: 'someone@example.com',
    url: WORKSHOP_ORIGIN,
    stage: 'requested',
    newDomain: 'example.org',
    at: AT,
    origin: WORKSHOP_ORIGIN,
  });
const completed = () =>
  emailChangeNoticeMessage({
    to: 'someone@example.com',
    url: WORKSHOP_ORIGIN,
    stage: 'completed',
    newDomain: 'example.org',
    at: AT,
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
const STATES_STATES: Record<string, ReactNode> = {
  Requested: <EmailPreview message={requested} />,
  Completed: <EmailPreview message={completed} />,
};

export const States: Story = {
  args: { state: 'Requested' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
