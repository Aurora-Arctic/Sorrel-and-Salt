import type { Metadata } from 'next';
import { cache } from 'react';
import InvitationAcceptance from '../../../components/InvitationAcceptance';
import type { InvitationAcceptanceProps } from '../../../components/InvitationAcceptance/types';
import { emailPagePath } from '../../../lib/account-email';
import { getSession } from '../../../lib/request-session';
import { ADMIN_LANDING, signInPath } from '../../../lib/sign-in';
import { invitationStanding } from '@/modules/identity';
import type { InvitePageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Invitation — Sorrel & Salt',
};

// Cached so a second render in the request reads once (CLAUDE.md rule 1).
const standingOf = cache(invitationStanding);

// The one accept route, for both tiers of `invitations` (MB.202), built by
// MB.70 with the site tier; M7.5 adds the workspace's landing. Public in
// src/proxy.ts, so a signed-out visitor is asked to sign in and brought back.
// `getSession()` rather than `requireSession()`: an unverified account is
// told why it cannot accept yet and sent to confirm its address with the way
// back, where the redirect would drop the reason
// (claude-docs/auth/admin-users.md, "Inviting an admin").
export default async function InvitePage({ params }: InvitePageProps) {
  const [{ token }, session] = await Promise.all([params, getSession()]);
  const here = `/invite/${encodeURIComponent(token)}`;

  let panel: InvitationAcceptanceProps;
  if (!session) {
    // Nothing of the invitation is read until a session holds the link.
    panel = { status: 'signed-out', signInHref: signInPath(here) };
  } else {
    const standing = await standingOf(session, token);
    panel = standing.acceptable
      ? { status: 'acceptable', token, tier: standing.tier, landing: ADMIN_LANDING }
      : {
          status: 'refused',
          message: standing.message,
          emailHref: standing.reason === 'unverified' ? emailPagePath(here) : undefined,
        };
  }

  return (
    <main className="invitation-page">
      <InvitationAcceptance {...panel} />
    </main>
  );
}
