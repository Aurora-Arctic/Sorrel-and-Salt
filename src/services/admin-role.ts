import { withAudit } from '../db/repository';
import { users } from '../db/schema/users';
import type { Session } from '../lib/session';

// The primary admin is promoted at sign-in, and only by a provider that
// vouches for the address: claude-docs/design-decisions/m2.9-granting-admin.md,
// "The primary admin", and claude-docs/auth.md, "Admin bootstrap".

/**
 * Google marks an address verified only for a domain its owner has proved to
 * Google, and Discord only for one it has mailed a code to. Facebook never
 * vouches in Better Auth's mapping; Microsoft's `common` tenant lets any Entra
 * tenant mint the claim (the 2023 "nOAuth" surface), so it is left out on
 * purpose rather than by omission.
 */
const VOUCHING_PROVIDERS: ReadonlySet<string> = new Set(['google', 'discord']);

/** What the provider said at this callback — never the stored row, which a later feature may set. */
export interface SignInProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
}

export type PrimaryAdminOutcome =
  | 'promoted'
  | 'already-admin'
  | 'not-primary'
  | 'no-profile'
  | 'provider-does-not-vouch'
  | 'unverified'
  | 'profile-email-differs';

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Promotes the signed-in user to admin when their account is the address
 * `primaryAdminEmail` names and this sign-in's provider vouches for it.
 * `session` is the user's own, so the write is stamped as them.
 */
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

// The one role write, which granting and revoking will share.
async function grantAdmin(session: Session): Promise<void> {
  await withAudit(session, (write) => write.updateById(users, session.userId, { role: 'admin' }));
}
