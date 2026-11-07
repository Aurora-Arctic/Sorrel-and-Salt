import type { Route } from 'next';
import { cache } from 'react';
import InvitationAcceptance from '../../../components/InvitationAcceptance';
import type { InvitationAcceptanceProps } from '../../../components/InvitationAcceptance/types';
import { emailPagePath } from '../../../lib/account-email';
import { getSession } from '../../../lib/request-session';
import { ADMIN_LANDING, CURATOR_LANDING, signInPath } from '../../../lib/sign-in';
import { invitationStanding } from '@/modules/identity';

const standingOf = cache(invitationStanding);

// `Route<T>` checks the address against the built routes only when `T` is
// inferred from it (see src/components/CovenNav/sections.ts).
const route = <T extends string>(href: Route<T>): Route => href as Route;

const CARD_LANDING = '/coven/new' satisfies Route;

const CARD_ACCEPTED_LANDING = `${CARD_LANDING}?card=accepted` as Route;

// The one accept panel for `/invite/[token]` and `/i/[token]`, public in src/proxy.ts. `getSession()`, not
// `requireSession()`: an unverified account is told why it cannot accept yet (claude-docs/auth/admin-users.md, "Inviting a keeper").
export default async function InvitationPanel({ token, here }: { token: string; here: string }) {
  const session = await getSession();

  let panel: InvitationAcceptanceProps;
  if (!session) {
    panel = {
      status: 'signed-out',
      signInHref: signInPath(here),
      card: here.startsWith('/i/'),
    };
  } else {
    const standing = await standingOf(session, token);
    if (!standing.acceptable) {
      panel = {
        status: 'refused',
        message: standing.message,
        token,
        emailHref: standing.reason === 'unverified' ? emailPagePath(here) : undefined,
        startCovenHref: standing.reason === 'used-by-you' ? CARD_LANDING : undefined,
      };
    } else if (standing.tier === 'site') {
      panel = {
        status: 'acceptable',
        token,
        tier: 'site',
        siteRole: standing.siteRole,
        landing: standing.siteRole === 'admin' ? ADMIN_LANDING : CURATOR_LANDING,
      };
    } else if (standing.tier === 'card') {
      panel = { status: 'acceptable', token, tier: 'card', landing: CARD_ACCEPTED_LANDING };
    } else {
      panel = {
        status: 'acceptable',
        token,
        tier: 'workspace',
        landing: route(`/coven/${standing.slug}`),
        covenName: standing.name,
      };
    }
  }

  return <InvitationAcceptance {...panel} />;
}
