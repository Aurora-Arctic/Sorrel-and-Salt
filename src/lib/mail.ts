import { deliver } from './mail-transport';
import type { Message } from './types';

// One try at a mail, here and now: what a mail job falls back to when its run cannot be started or MAIL_TRANSPORT is unset, and
// the one mail with no row to rebuild it from. A retried mail goes through its module's job instead, whose run holds ids and
// never the message (claude-docs/email.md, "Sending"). Never throws: a send that fails is logged by `deliver`.

export async function send(message: Message): Promise<void> {
  try {
    await deliver(message);
  } catch {}
}
