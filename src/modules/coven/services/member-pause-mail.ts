import 'server-only';
import { findOneById, findWorkspaceMemberPauseForMail } from '../../../db/repository';
import { deliverMessageFor } from '../../../lib/deliver-message-for';
import { memberPauseNotice } from '../../../lib/pause-job-mail';
import { users } from '../../identity/schema/users';
import { workspaces } from '../schema/workspaces';
import type { Message } from '../../../lib/types';
import type { MemberPauseMail } from '../types';

// The coven access pause mail, built from the rows when it is sent, so the job that retries it carries ids alone.

export async function memberPauseMessageFor(mail: MemberPauseMail): Promise<Message | null> {
  const pause = await findWorkspaceMemberPauseForMail(mail.pauseId);
  if (!pause || pause.liftedAt) return null;
  const [member, coven] = await Promise.all([
    findOneById(users, pause.userId),
    findOneById(workspaces, pause.workspaceId),
  ]);
  if (!member || !coven) return null;
  return memberPauseNotice(mail.origin, member.email, coven.name, pause);
}

/** A transport failure throws, so a job's step is retried. */
export async function sendMemberPauseMail(mail: MemberPauseMail): Promise<boolean> {
  return deliverMessageFor(memberPauseMessageFor, mail);
}
