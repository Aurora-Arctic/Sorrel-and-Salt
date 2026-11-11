import { deliver } from './mail-transport';
import type { Message } from './types';

// A file of its own so a job's step reaches the transport without the code that starts runs.

/** Sends the message `messageFor` builds from `mail`: true once the transport took it, false when there was none to send. A transport failure throws. */
export async function deliverMessageFor<Mail>(
  messageFor: (mail: Mail) => Promise<Message | null>,
  mail: Mail,
): Promise<boolean> {
  const message = await messageFor(mail);
  if (!message) return false;
  return deliver(message);
}
