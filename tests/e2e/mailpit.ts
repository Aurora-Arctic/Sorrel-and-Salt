// Reads what the app mailed from Mailpit's REST API, which is how a spec
// follows a mailed link. MAILPIT_URL is set by compose's `e2e` and
// `devcontainer` services and by playwright.yml.

export type MailpitMessage = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
};

type Address = { Address: string };
type Summary = { ID: string };
type Detail = { From: Address; To: Address[]; Subject: string; Text: string; HTML: string };

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
 * The newest message to `address`, waiting up to `timeout` ms for one to
 * arrive — a send the app makes in the background lands after the click
 * that caused it.
 */
export async function latestMessageTo(address: string, timeout = 10_000): Promise<MailpitMessage> {
  const search = mailpitUrl('/api/v1/search');
  // Quoted: Mailpit's query language splits an unquoted address on `+`.
  search.searchParams.set('query', `to:"${address}"`);
  search.searchParams.set('limit', '1');

  const deadline = Date.now() + timeout;
  for (;;) {
    // Newest first.
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
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
