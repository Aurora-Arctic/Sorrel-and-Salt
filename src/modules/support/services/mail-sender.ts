import 'server-only';
import { findOneById } from '../../../db/repository';
import { users } from '../../identity/schema/users';
import type { SupportNotifier, SupportRequestRow } from '../types';

type StatusMail = 'received' | 'resolved';

/**
 * Mails a request's sender one of the status mails: the address a signed-out sender gave, or the account's address. A sender
 * who has left gets none, and the request is already saved, so neither is lost.
 */
export async function mailSender(
  notifier: SupportNotifier,
  request: SupportRequestRow,
  mail: StatusMail,
): Promise<void> {
  if (request.senderEmail) {
    await notifier[mail](request.senderEmail, request.subject, null);
    return;
  }
  const sender = await findOneById(users, request.createdBy);
  if (sender) await notifier[mail](sender.email, request.subject, request.id);
}
