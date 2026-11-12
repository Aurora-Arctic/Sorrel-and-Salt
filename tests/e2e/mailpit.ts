import type { Detail, MailpitMessage, Summary } from './types';
import { pauseBetweenPolls } from './waits';

// Reads what the app mailed from Mailpit's REST API, which is how a spec
// follows a mailed link. MAILPIT_URL is set by compose's `e2e` and
// `devcontainer` services and by playwright.yml.

function mailpitUrl(path: string): URL {
  const base = process.env.MAILPIT_URL;
  if (!base)
    throw new Error("MAILPIT_URL is not set; the e2e run needs compose's `mailpit` service");
  return new URL(path, base);
}

async function get<T>(url: URL): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Mailpit answered ${response.status} for ${url.pathname}`);
  return (await response.json()) as T;
}

/**
 * The newest message to `address`, waiting up to `timeout` ms: a send the app makes in the background
 * lands after the click that caused it. With `subject`, the newest with that subject, so an earlier
 * mail to the same address is never read in its place.
 */
export async function latestMessageTo(
  address: string,
  timeout = 10_000,
  subject?: string,
): Promise<MailpitMessage> {
  const search = mailpitUrl('/api/v1/search');
  // Quoted: Mailpit's query language splits an unquoted address on `+`.
  const to = `to:"${address}"`;
  search.searchParams.set('query', subject ? `${to} subject:"${subject}"` : to);
  search.searchParams.set('limit', '1');

  const deadline = Date.now() + timeout;
  for (;;) {
    const { messages } = await get<{ messages: Summary[] }>(search);
    if (messages.length > 0) {
      const detail = await get<Detail>(mailpitUrl(`/api/v1/message/${messages[0].ID}`));
      return {
        from: detail.From.Address,
        to: detail.To.map((recipient) => recipient.Address),
        subject: detail.Subject,
        text: detail.Text,
        html: detail.HTML,
      };
    }
    if (Date.now() > deadline)
      throw new Error(`No message to ${address} reached Mailpit in ${timeout}ms`);
    await pauseBetweenPolls(250, 'Mailpit has no event to wait on, so the inbox is asked again');
  }
}

/** The address-verification link in a mailed message. */
export const VERIFY_LINK = /https?:\/\/[^\s\])>"]+\/verify-email\?[^\s\])>"]+/;

/** The invitation's path from the mailed link: the build's origin is its fallback, not this server. */
export async function mailedInvitePath(to: string): Promise<string> {
  const message = await latestMessageTo(to);
  const link = message.text.match(/https?:\/\/\S+\/invite\/[A-Za-z0-9_-]+/)?.[0];
  if (!link) throw new Error(`no invitation link in the mail to ${to}: ${message.text}`);
  return new URL(link).pathname;
}

/** How many messages to `address` Mailpit holds now, with no wait: "nothing was mailed" is read here. */
export async function countMessagesTo(address: string): Promise<number> {
  const search = mailpitUrl('/api/v1/search');
  search.searchParams.set('query', `to:"${address}"`);
  const { messages } = await get<{ messages: unknown[] }>(search);
  return messages.length;
}
