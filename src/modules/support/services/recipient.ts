import 'server-only';
import { findOneById } from '../../../db/repository';
import { users } from '../../identity/schema/users';
import type { SupportRequestRow } from '../types';
import { mintSupportViewToken } from './view-link';

/**
 * Where a mail about `request` goes: the address a signed-out sender gave, or the account's own. `viewToken` is minted for a
 * signed-out sender only, who has no account to sign in to. Null when the sender has no address, as when they have left.
 */
export async function supportRecipientFor(
  request: Pick<SupportRequestRow, 'id' | 'createdBy' | 'senderEmail'>,
): Promise<{ to: string; signedOut: boolean; viewToken: string | undefined } | null> {
  const signedOut = request.senderEmail !== null;
  const to = request.senderEmail ?? (await findOneById(users, request.createdBy))?.email;
  if (!to) return null;
  return {
    to,
    signedOut,
    viewToken: signedOut ? await mintSupportViewToken(request.id) : undefined,
  };
}
