import type { Route } from 'next';
import { cache } from 'react';
import InvitationAcceptance from '../../../components/InvitationAcceptance';
import type { InvitationAcceptanceProps } from '../../../components/InvitationAcceptance/types';
import type { PageHeaderProps } from '../../../components/PageHeader/types';
import { emailPagePath } from '../../../lib/account-email';
import { getSession } from '../../../lib/request-session';
import { ADMIN_LANDING, CURATOR_LANDING } from '../../../lib/sign-in';
// Server component, so the env var names this reads never reach the client bundle; only the `configured` ids pass as a prop.
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from '../../../lib/social-providers-config';
import { getMe, invitationStanding, isPlaceholderEmail } from '@/modules/identity';

// Cached so a second render in the request reads once (CLAUDE.md rule 1).
const standingOf = cache(invitationStanding);

// `Route<T>` checks the address against the built routes only when `T` is inferred from it.
const route = <T extends string>(href: Route<T>): Route => href as Route;

const CARD_LANDING = '/coven/new' satisfies Route;

// The same page with the marker that makes it say what the card gave. A cast, as the built routes know no query.
const CARD_ACCEPTED_LANDING = `${CARD_LANDING}?card=accepted` as Route;

// `getSession()`, not `requireSession()`: an unverified account is told why it cannot accept yet, where a redirect would drop the reason (claude-docs/auth/admin-users.md, "Inviting a keeper").
export default async function InvitationPanel({
  token,
  here,
  headingLevel,
  linkFailed = false,
}: {
  token: string;
  here: string;
  /** The page was reached with `?error=`, a verification link refused on its way back. */
  linkFailed?: boolean;
  headingLevel?: PageHeaderProps['level'];
}) {
  const session = await getSession();

  let panel: InvitationAcceptanceProps;
  if (!session) {
    // Nothing of the invitation is read until a session holds the link.
    panel = {
      status: 'signed-out',
      next: here,
      configured: configuredProviders(),
      card: here.startsWith('/i/'),
    };
  } else {
    const standing = await standingOf(session, token);
    // An unverified account matched the address, so its inbox holds the message, unless the address is a stand-in.
    const unverifiedEmail =
      !standing.acceptable && standing.reason === 'unverified'
        ? (await getMe(session)).email
        : undefined;
    if (unverifiedEmail !== undefined && !isPlaceholderEmail(unverifiedEmail)) {
      panel = {
        status: 'unverified',
        emailHref: emailPagePath(here),
        ...(linkFailed && { linkFailed }),
      };
    } else if (!standing.acceptable) {
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

  return <InvitationAcceptance {...panel} headingLevel={headingLevel} />;
}
