import 'server-only';
import { withAudit } from '../../../db/repository';
import { sameAddress } from '../../../lib/primary-admin';
import { users } from '../schema/users';
import type { Session } from '../../../lib/session';
import type { PrimaryAdminOutcome, SignInProfile } from '../types';

// The primary admin is promoted at sign-in, by a provider that vouches for the
// address, or at first-party verification, by our own mail:
// claude-docs/design-decisions/m2.9-granting-admin.md, "The primary admin",
// and claude-docs/auth/admin-bootstrap.md, "Admin bootstrap".

/**
 * Google marks an address verified only for a domain its owner has proved, and Discord only for one it has mailed a code to.
 * Facebook never vouches; Microsoft's `common` tenant lets any Entra tenant mint the claim ("nOAuth"), so it is left out on purpose.
 */
const VOUCHING_PROVIDERS: ReadonlySet<string> = new Set(['google', 'discord']);

/** Promotes the signed-in user to admin when their account is `primaryAdminEmail` and this sign-in's provider vouches for it. */
export async function promotePrimaryAdmin(
  session: Session,
  {
    accountEmail,
    profile,
    primaryAdminEmail,
  }: {
    accountEmail: string;
    profile: SignInProfile | undefined;
    primaryAdminEmail: string | undefined;
  },
): Promise<PrimaryAdminOutcome> {
  if (!primaryAdminEmail || !sameAddress(accountEmail, primaryAdminEmail)) return 'not-primary';
  if (session.role === 'admin') return 'already-admin';
  if (!profile) return 'no-profile';
  if (!VOUCHING_PROVIDERS.has(profile.providerId)) return 'provider-does-not-vouch';
  if (!profile.emailVerified) return 'unverified';
  // A linked provider whose own address has since moved vouches for that one, not this.
  if (!sameAddress(profile.email, accountEmail)) return 'profile-email-differs';

  await grantAdmin(session);
  return 'promoted';
}

/**
 * Promotes the user who has just verified their address by our own mail, when it is `primaryAdminEmail`. The caller must have checked
 * that the link was honoured from a session holding the row, since that is what makes the mail vouch.
 */
export async function promotePrimaryAdminAtVerification(
  session: Session,
  {
    accountEmail,
    primaryAdminEmail,
  }: { accountEmail: string; primaryAdminEmail: string | undefined },
): Promise<Extract<PrimaryAdminOutcome, 'promoted' | 'already-admin' | 'not-primary'>> {
  if (!primaryAdminEmail || !sameAddress(accountEmail, primaryAdminEmail)) return 'not-primary';
  if (session.role === 'admin') return 'already-admin';

  await grantAdmin(session);
  return 'promoted';
}

// The primary admin's role write. A grant sets the creation flag in the same
// write, since the users CHECK refuses an admin without it, and the
// trigger on `users` records both, by the route declared here.
async function grantAdmin(session: Session): Promise<void> {
  await withAudit(
    session,
    (write) => write.updateById(users, session.userId, { role: 'admin', canCreateWorkspace: true }),
    { via: 'bootstrap' },
  );
}
