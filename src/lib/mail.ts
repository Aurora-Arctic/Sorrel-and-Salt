import type { Message, Outgoing } from './types';
// Outgoing mail, over HTTP to every target: SMTP from a Vercel function is
// unreliable. A refused or failed send is logged and never thrown, so a
// provider outage costs a resend rather than a sign-in or an invitation.
// claude-docs/design-decisions/mb.61-email-verification-and-delivery.md,
// "Delivery".

// A send never throws, so the log is how a refused or failed one is seen.
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

/** Sends through MAIL_TRANSPORT. Never throws; with MAIL_TRANSPORT unset outside a deployment, logs the message instead. */
export async function send(message: Message): Promise<void> {
  // RFC 2606 reserves `.invalid`: no mailbox exists under it, so the address
  // is the placeholder a provider that shared none is stored under
  // (src/modules/identity/services/email.ts), and nothing can receive this.
  if (/\.invalid$/i.test(message.to)) {
    console.error(`mail: refused a recipient under .invalid; "${message.subject}" not sent`);
    return;
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
    return;
  }
  if (!transport) {
    console.info('mail: MAIL_TRANSPORT is unset; logged, not sent:', message);
    return;
  }

  const request = outgoing(transport, message);
  if (typeof request === 'string') {
    console.error(`mail: ${request}; "${message.subject}" not sent`);
    return;
  }

  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...request.headers },
      body: JSON.stringify(request.body),
    });
    if (!response.ok) {
      console.error(
        `mail: ${transport} answered ${response.status}; "${message.subject}" not sent: ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error(`mail: ${transport} send failed; "${message.subject}" not sent`, error);
  }
}
