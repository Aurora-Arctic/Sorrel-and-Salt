import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRun, start } from 'workflow/api';
import { mailDelivery } from '@/lib/mail-delivery';

// One mail's delivery run, end to end in the SDK's local world, against a stand-in Mailpit that can be told to fail. The run's
// result is the mail's "sent" marker: true only once the transport took it.

const MAILPIT_URL = 'http://mailpit.test';
const MESSAGE = {
  to: 'reader@mail-delivery-run.test',
  subject: 'A Testwort notice',
  text: 'Plain words.',
  html: '<p>Plain words.</p>',
};

let failNext = 0;
const attempts: string[] = [];
const received: string[] = [];

// The stand-in answers fetch itself rather than listening on a port: the local world finds its own queue by the port this process
// listens on, so a second listener would take its deliveries.
const realFetch = globalThis.fetch;
async function mailpit(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith(MAILPIT_URL)) return realFetch(input, init);
  const mail = JSON.parse(String(init?.body)) as { To: { Email: string }[] };
  attempts.push(mail.To[0]!.Email);
  if (failNext > 0) {
    failNext -= 1;
    return new Response('down', { status: 503 });
  }
  received.push(mail.To[0]!.Email);
  return Response.json({ ID: 'stand-in' });
}

beforeAll(() => {
  vi.stubGlobal('fetch', mailpit);
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  vi.stubEnv('VERCEL_ENV', '');
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  failNext = 0;
  attempts.length = 0;
  received.length = 0;
});

describe('a mail delivery run', () => {
  it('retries a send the transport refused twice, and marks it sent once', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failNext = 2;
    const run = await start(mailDelivery, [MESSAGE]);

    await expect(run.returnValue).resolves.toBe(true);
    // Precondition: the first two attempts really failed, so the success is a retry's.
    expect(attempts).toHaveLength(3);
    expect(received).toEqual([MESSAGE.to]);
    errors.mockRestore();
  });

  it('logs a send that fails every attempt, and leaves it unmarked', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failNext = Number.POSITIVE_INFINITY;
    const run = await start(mailDelivery, [MESSAGE]);

    await expect(run.returnValue).resolves.toBe(false);
    await expect(getRun(run.runId).status).resolves.toBe('completed');
    // The first try and the SDK's three retries.
    expect(attempts).toHaveLength(4);
    expect(received).toEqual([]);
    const lines = errors.mock.calls.map(([line]) => String(line));
    // One line per attempt from the transport, besides whatever the SDK logs of the step's error.
    expect(lines.filter((line) => line.startsWith('mail: mailpit answered 503'))).toHaveLength(4);
    expect(lines.some((line) => line.includes(`every attempt failed; "${MESSAGE.subject}"`))).toBe(
      true,
    );
    errors.mockRestore();
  });
});
