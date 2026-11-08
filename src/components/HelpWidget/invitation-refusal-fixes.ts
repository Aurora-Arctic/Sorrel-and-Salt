import type { InvitationRefusal } from '@/modules/identity';
import { emailPagePath } from '../../lib/account-email';
import type { RefusalFixes } from './types';

// Who can put each refusal right and what to do now, keyed by the reason the service gives, so a reason added there fails
// the type here. `card` is for the printed card's wording of the reason; `action` is the accept page's own button for it,
// as `src/app/invite/[token]/invitation-panel.tsx` sets it (claude-docs/components/help-pages.md, "Widgets").

export const REFUSAL_FIXES: Readonly<Record<InvitationRefusal, RefusalFixes>> = {
  invalid: {
    link: { who: 'You', now: 'Copy the whole link from the email and open it again.' },
    card: {
      who: 'You',
      now: 'Check the printed link or QR code and try again, or ask a coven to invite you.',
    },
  },
  accepted: {
    link: {
      who: 'No One Needs To',
      now: 'Sign in with the account that accepted it; it is already a member.',
    },
  },
  'used-by-you': {
    link: { who: 'You', now: 'Start a coven from your account; the card has done its work.' },
    action: { label: 'Start a Coven', href: '/coven/new' },
  },
  'used-another-card': {
    link: { who: 'No One Needs To', now: 'Nothing to do; you already have what a card gives.' },
  },
  declined: {
    link: { who: 'Whoever Sent It', now: 'Ask whoever sent it for a new invitation.' },
  },
  revoked: {
    link: { who: 'Whoever Sent It', now: 'Ask whoever sent it for a new invitation.' },
    card: { who: 'Whoever Sent It', now: 'Ask a coven to invite you.' },
  },
  expired: {
    link: { who: 'Whoever Sent It', now: 'Ask whoever sent it for a new invitation.' },
    card: { who: 'Whoever Sent It', now: 'Ask a coven to invite you.' },
  },
  closed: {
    link: {
      who: 'No One Needs To',
      now: 'Nothing to do for this coven; ask another coven to invite you.',
    },
  },
  'different-address': {
    link: {
      who: 'You',
      now: 'Sign out, then sign in with the account whose address received the email.',
    },
  },
  unverified: {
    link: {
      who: 'You',
      now: 'Confirm your address from your account page, then open the link again.',
    },
    action: { label: 'Confirm Your Email', href: emailPagePath(undefined) },
  },
  paused: {
    link: { who: 'A Keeper', now: 'Wait, then open the link again once keeper changes resume.' },
  },
};
