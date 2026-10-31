import type { Route } from 'next';
import { cache } from 'react';
import InvitationAcceptance from '../../../components/InvitationAcceptance';
import type { InvitationAcceptanceProps } from '../../../components/InvitationAcceptance/types';
import { emailPagePath } from '../../../lib/account-email';
import { getSession } from '../../../lib/request-session';
import { ADMIN_LANDING, signInPath } from '../../../lib/sign-in';
import { invitationStanding } from '@/modules/identity';

// Cached so a second render in the request reads once (CLAUDE.md rule 1).
const standingOf = cache(invitationStanding);

// `Route<T>` checks the address against the built routes only when `T` is
// inferred from it (see src/components/CovenNav/sections.ts).
const route = <T extends string>(href: Route<T>): Route => href as Route;

/** Where an account that accepts a card lands: it can now start a coven. */
const CARD_LANDING = '/coven/new' satisfies Route;

// The same page with the marker that makes it say what the card gave. A cast, as the built routes know no query.
const CARD_ACCEPTED_LANDING = `${CARD_LANDING}?card=accepted` as Route;

// The one accept panel for `/invite/[token]` and `/i/[token]`, public in src/proxy.ts. `getSession()`,
// not `requireSession()`: an unverified account is told why it cannot accept yet, where a redirect
// would drop the reason (claude-docs/auth/admin-users.md, "Inviting an admin"). `here` is the path
// the visitor came by, so sign-in and the email page return to it.
export default async function InvitationPanel({ token, here }: { token: string; here: string }) {
  const session = await getSession();

  let panel: InvitationAcceptanceProps;
  if (!session) {
    // Nothing of the invitation is read until a session holds the link.
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
        landing: ADMIN_LANDING,
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
