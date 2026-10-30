import type { Metadata, Route } from 'next';
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

// `Route<T>` checks the address against the built routes only when `T` is
// inferred from it (see src/components/CovenNav/sections.ts).
const route = <T extends string>(href: Route<T>): Route => href as Route;

// The one accept route for both invitation tiers, public in src/proxy.ts. `getSession()`, not
// `requireSession()`: an unverified account is told why it cannot accept yet, where a redirect would
// drop the reason (claude-docs/auth/admin-users.md, "Inviting an admin").
export default async function InvitePage({ params }: InvitePageProps) {
  const [{ token }, session] = await Promise.all([params, getSession()]);
  const here = `/invite/${encodeURIComponent(token)}`;

  let panel: InvitationAcceptanceProps;
  if (!session) {
    // Nothing of the invitation is read until a session holds the link.
    panel = { status: 'signed-out', signInHref: signInPath(here) };
  } else {
    const standing = await standingOf(session, token);
    panel = !standing.acceptable
      ? {
          status: 'refused',
          message: standing.message,
          emailHref: standing.reason === 'unverified' ? emailPagePath(here) : undefined,
        }
      : standing.tier === 'site'
        ? {
            status: 'acceptable',
            token,
            tier: 'site',
            siteRole: standing.siteRole,
            landing: ADMIN_LANDING,
          }
        : {
            status: 'acceptable',
            token,
            tier: 'workspace',
            landing: route(`/coven/${standing.slug}`),
            covenName: standing.name,
          };
  }

  return (
    <main className="page-frame page-frame--narrow">
      <InvitationAcceptance {...panel} />
    </main>
  );
}
