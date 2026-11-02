import type { Message, Outgoing } from './types';
// One attempt at handing a message to a transport, over HTTP to every target, as SMTP from a Vercel function is unreliable.
// `deliver` throws a transport failure so the job step that calls it is retried; `send` in ./mail is what callers use
// (claude-docs/email.md, "Sending").

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

/** The request for a transport, or why it cannot be built. Keys are read here, at send time, never at build. */
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

/** Thrown by `deliver` when the transport did not take a message, so a job step's retry tries it again. */
export class MailNotSent extends Error {
  override name = 'MailNotSent';
}

/**
 * Hands the message to MAIL_TRANSPORT once. True when the transport took it, or when MAIL_TRANSPORT is unset outside a deployment
 * and the message is logged in its place; false when it is refused before any transport is tried (a recipient under `.invalid`, or
 * a transport this environment may not use), which no retry would change. Every outcome but success is logged.
 *
 * @throws {MailNotSent} the transport answered with an error, or could not be reached.
 */
export async function deliver(message: Message): Promise<boolean> {
  // RFC 2606 reserves `.invalid`: no mailbox exists under it, so the address
  // is the placeholder a provider that shared none is stored under
  // (src/modules/identity/services/email.ts), and nothing can receive this.
  if (/\.invalid$/i.test(message.to)) {
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
    console.error(
      `mail: ${transport} answered ${response.status}; "${message.subject}" not sent: ${await response.text()}`,
    );
    throw new MailNotSent(`${transport} answered ${response.status}`);
  }
  return true;
}
