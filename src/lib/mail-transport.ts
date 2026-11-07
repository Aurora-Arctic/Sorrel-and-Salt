import type { Message, Outgoing } from './types';
// HTTP to every target, as SMTP from a Vercel function is unreliable. `deliver` throws a transport failure so the job step that calls it is retried (claude-docs/email.md, "Sending").

// The log is how a refused or failed send is seen.
/* oxlint-disable no-console */

// The one transport each deployed environment may use. Anything else there,
// unset included, is refused: a copied variable cannot point a preview at live
// delivery or production at a sandbox.
const REQUIRED_TRANSPORT: Record<string, string> = {
  production: 'resend',
  preview: 'mailtrap-sandbox',
};

// The captures never deliver, so their sender needs no verified domain;
// Resend's comes from MAIL_FROM, which must be on the domain Resend verified.
const CAPTURE_FROM = { email: 'noreply@sorrelandsalt.com', name: 'Sorrel & Salt' };

/** Keys are read here, at send time, never at build. */
function outgoing(transport: string, message: Message): Outgoing | string {
  const { to, subject, text, html } = message;
  const env = process.env;
  switch (transport) {
    case 'resend':
      if (!env.RESEND_API_KEY || !env.MAIL_FROM) return 'resend needs RESEND_API_KEY and MAIL_FROM';
      return {
        url: 'https://api.resend.com/emails',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: { from: env.MAIL_FROM, to: [to], subject, text, html },
      };
    case 'mailtrap-sandbox':
      if (!env.MAILTRAP_SANDBOX_TOKEN || !env.MAILTRAP_SANDBOX_ID) {
        return 'mailtrap-sandbox needs MAILTRAP_SANDBOX_TOKEN and MAILTRAP_SANDBOX_ID';
      }
      return {
        url: `https://sandbox.api.mailtrap.io/api/send/${env.MAILTRAP_SANDBOX_ID}`,
        headers: { 'Api-Token': env.MAILTRAP_SANDBOX_TOKEN },
        body: { from: CAPTURE_FROM, to: [{ email: to }], subject, text, html },
      };
    case 'mailpit':
      if (!env.MAILPIT_URL) return 'mailpit needs MAILPIT_URL';
      return {
        url: new URL('/api/v1/send', env.MAILPIT_URL).href,
        headers: {},
        body: {
          From: { Email: CAPTURE_FROM.email, Name: CAPTURE_FROM.name },
          To: [{ Email: to }],
          Subject: subject,
          Text: text,
          HTML: html,
        },
      };
    default:
      return `unrecognised MAIL_TRANSPORT=${transport}`;
  }
}

export interface MailNotSentDetails {
  status?: number | null;
  code?: string | null;
}

/** `status` and `code` are null when the transport could not be reached, or its answer named no error. */
export class MailNotSent extends Error {
  override name = 'MailNotSent';
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, details: MailNotSentDetails = {}) {
    super(message);
    this.status = details.status ?? null;
    this.code = details.code ?? null;
  }
}

function errorName(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null && 'name' in parsed) {
      return typeof parsed.name === 'string' ? parsed.name : null;
    }
  } catch {
    // Not JSON: there is no name to read.
  }
  return null;
}

/** RFC 2606 reserves `.invalid`: no mailbox exists there, so `deliver` refuses it. */
export function isUndeliverableAddress(address: string): boolean {
  return /\.invalid$/i.test(address);
}

/**
 * False when refused before any transport is tried, which no retry would change.
 *
 * @throws {MailNotSent} the transport answered with an error, or could not be reached.
 */
export async function deliver(message: Message): Promise<boolean> {
  // RFC 2606 reserves `.invalid`; it is the placeholder address of a provider that shared none (src/modules/identity/services/email.ts).
  if (isUndeliverableAddress(message.to)) {
    console.error(`mail: refused a recipient under .invalid; "${message.subject}" not sent`);
    return false;
  }
  // '' is unset, as Vercel and compose both write an empty variable.
  const transport = process.env.MAIL_TRANSPORT || undefined;
  const vercelEnv = process.env.VERCEL_ENV || undefined;
  const required = vercelEnv && REQUIRED_TRANSPORT[vercelEnv];

  // The body is never logged here: it carries the link a verification or an
  // invitation is proved by.
  if (required && transport !== required) {
    console.error(
      `mail: refused MAIL_TRANSPORT=${transport ?? '(unset)'} at VERCEL_ENV=${vercelEnv}, which sends only through ${required}; "${message.subject}" not sent`,
    );
    return false;
  }
  if (!transport) {
    console.info('mail: MAIL_TRANSPORT is unset; logged, not sent:', message);
    return true;
  }

  const request = outgoing(transport, message);
  if (typeof request === 'string') {
    console.error(`mail: ${request}; "${message.subject}" not sent`);
    return false;
  }

  let response: Response;
  try {
    response = await fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...request.headers },
      body: JSON.stringify(request.body),
    });
  } catch (error) {
    console.error(`mail: ${transport} send failed; "${message.subject}" not sent`, error);
    throw new MailNotSent(`${transport} could not be reached`);
  }
  if (!response.ok) {
    const body = await response.text();
    console.error(
      `mail: ${transport} answered ${response.status}; "${message.subject}" not sent: ${body}`,
    );
    throw new MailNotSent(`${transport} answered ${response.status}`, {
      status: response.status,
      code: errorName(body),
    });
  }
  return true;
}
