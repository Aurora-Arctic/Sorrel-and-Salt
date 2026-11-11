import { covenPath } from '@/lib/coven-path';
import type { Route } from 'next';
import { cache } from 'react';
import InvitationAcceptance from '@/components/InvitationAcceptance';
import type {
  InvitationAcceptanceProps,
  SignedOutLead,
} from '@/components/InvitationAcceptance/types';
import type { PageHeaderProps } from '@/components/PageHeader/types';
import { emailPagePath } from '@/lib/account-email';
import { isSiteInvitationMarker } from '@/lib/invitation-link';
import { getSession } from '@/lib/request-session';
import type { UserRole } from '@/lib/session';
import { ADMIN_LANDING, CURATOR_LANDING } from '@/lib/sign-in';
import { providersToPass } from '@/lib/configured-providers';
import { getMe, invitationStanding, isPlaceholderEmail } from '@/modules/identity';

// Cached so a second render in the request reads once (CLAUDE.md rule 1).
const standingOf = cache(invitationStanding);

const CARD_LANDING = '/coven/new' satisfies Route;

// Where each site role signs in to; `user` was given coven creation alone, so it lands on starting one.
const SITE_LANDINGS: Record<UserRole, Route> = {
  user: CARD_LANDING,
  curator: CURATOR_LANDING,
  admin: ADMIN_LANDING,
};

// The same page with the marker that makes it say what the card gave. A cast, as the built routes know no query.
const CARD_ACCEPTED_LANDING = `${CARD_LANDING}?card=accepted` as Route;

// The one place a signed-out invitation's leading choice is decided (claude-docs/components/invitation-acceptance.md). The
// marker is the link's word alone, never checked against the invitation: a hand-edited one changes only the button order.
const leadOf = (card: boolean, siteMarked: boolean): SignedOutLead =>
  card || siteMarked ? 'sign-up' : 'sign-in';

// `getSession()`, not `requireSession()`: an unverified account is told why it cannot accept yet, where a redirect would drop the reason (claude-docs/auth/admin-users.md, "Inviting a keeper").

export default async function InvitationPanel({
  token,
  here,
  headingLevel,
  linkFailed = false,
  marker,
}: {
  token: string;
  here: string;
  /** The page was reached with `?error=`, a verification link refused on its way back. */
  linkFailed?: boolean;
  headingLevel?: PageHeaderProps['level'];
  /** The link's site-invitation marker as the page received it (`src/lib/invitation-link.ts`). */
  marker?: string | string[];
}) {
  const session = await getSession();

  let panel: InvitationAcceptanceProps;
  if (!session) {
    // Nothing of the invitation is read until a session holds the link.
    const card = here.startsWith('/i/');
    panel = {
      status: 'signed-out',
      next: here,
      configured: providersToPass(),
      card,
      lead: leadOf(card, isSiteInvitationMarker(marker)),
      ...(linkFailed && { linkFailed }),
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
        landing: SITE_LANDINGS[standing.siteRole],
      };
    } else if (standing.tier === 'card') {
      panel = { status: 'acceptable', token, tier: 'card', landing: CARD_ACCEPTED_LANDING };
    } else {
      panel = {
        status: 'acceptable',
        token,
        tier: 'workspace',
        landing: covenPath(standing.slug),
        covenName: standing.name,
      };
    }
  }

  return <InvitationAcceptance {...panel} headingLevel={headingLevel} />;
}
