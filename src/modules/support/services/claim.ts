import 'server-only';
import { withAudit } from '../../../db/repository';
import { addressCountKey } from '../../../lib/send-count-key';

/**
 * Hands the signed-out requests written from an account's own address to it. Only a verified account claims: an
 * unverified address proves nothing, and a request already held by another account never moves. Returns the requests moved.
 */
export async function claimSignedOutRequests(user: {
  id: string;
  email: string;
  emailVerified: boolean;
}): Promise<number> {
  if (!user.emailVerified) return 0;
  return withAudit({ userId: user.id }, (write) =>
    write.claimSupportRequestsByEmail(user.id, user.email, addressCountKey(user.email)),
  );
}
