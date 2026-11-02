import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import { providerList } from './parts/providers';
import type { AccountExistsProps } from './types';

const SUBJECT = 'You Already Have an Account';

// The inbox line beside the subject.
const PREVIEW = 'Someone tried to sign up with this address, which already has an account.';

function howToSignIn(providers: AccountExistsProps['providers'], hasPassword: boolean): string {
  const named = providerList(providers);
  if (hasPassword && named) return `with your password or with ${named}`;
  if (hasPassword) return 'with your password';
  if (named) return `with ${named}`;
  return '';
}

// Sent in place of a second account, so the sign-up's answer cannot tell anyone the address is taken.
// No greeting by name: whoever made the sign-up need not be the holder.
export function AccountExists({
  url,
  providers,
  hasPassword,
  origin = new URL(url).origin,
  part,
}: AccountExistsProps) {
  const how = howToSignIn(providers, hasPassword);
  return h(
    EmailLayout,
    { preview: PREVIEW, heading: SUBJECT, origin },
    h(
      Paragraph,
      null,
      'Someone tried to make a new Sorrel & Salt account with this email address, which already has one. No second account was made.',
    ),
    h(
      Paragraph,
      null,
      `If that was you, sign in ${how ? `${how} ` : ''}instead: ${actionVerb(part)}.`,
    ),
    h(Action, { href: url, label: 'Sign In', part }),
    h(
      Paragraph,
      { muted: true },
      'If this was not you, nothing about your account has changed, and you can ignore this email.',
    ),
  );
}

/** The notice for an address that already has an account, rendered to the html and plain text `send` takes. */
export const accountExistsMessage = defineMessage<AccountExistsProps>(SUBJECT, AccountExists);
