import 'server-only';
import { withAudit } from '../../../db/repository';

/**
 * Hands an anonymous sender's support rows to the account it signed in as, written as that account, so the anonymous account
 * can then be deleted without a foreign key refusing it. Returns the requests moved.
 */
export async function adoptAnonymousSender(anonymousId: string, realId: string): Promise<number> {
  return withAudit({ userId: realId }, (write) => write.adoptAnonymousAccount(anonymousId, realId));
}

/**
 * Hands the signed-out requests written from an account's own address to it. Only a verified, ordinary account claims: an
 * unverified address proves nothing, and a request already held by another account never moves. Returns the requests moved.
 */
export async function claimSignedOutRequests(user: {
  id: string;
  email: string;
  emailVerified: boolean;
  isAnonymous?: boolean | null;
}): Promise<number> {
  if (!user.emailVerified || user.isAnonymous) return 0;
  return withAudit({ userId: user.id }, (write) =>
    write.claimSupportRequestsByEmail(user.id, user.email),
  );
}
