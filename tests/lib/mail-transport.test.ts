import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { server } from '../support/msw/server';
import { deliver, MailNotSent } from '@/lib/mail-transport';

// What `deliver` throws when Resend refuses a message: the HTTP status and Resend's error name, so a caller can tell a daily
// quota (try again tomorrow) from a monthly one (stop until a keeper resumes) without reading the log.

const MESSAGE = {
  to: 'recipient@example.test',
  subject: 'The privacy policy has changed',
  text: 'Read it here.',
  html: '<p>Read it here.</p>',
};

beforeEach(() => {
  for (const name of [
    'VERCEL_ENV',
    'MAILTRAP_SANDBOX_TOKEN',
    'MAILTRAP_SANDBOX_ID',
    'MAILPIT_URL',
  ]) {
    vi.stubEnv(name, '');
  }
  vi.stubEnv('MAIL_TRANSPORT', 'resend');
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  vi.stubEnv('MAIL_FROM', 'Sorrel & Salt <noreply@sorrelandsalt.com>');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Resend answers every send with `status` and this JSON error body. */
function resendAnswers(status: number, name: string) {
  server.use(
    http.post('https://api.resend.com/emails', () =>
      HttpResponse.json({ statusCode: status, name, message: 'Refused.' }, { status }),
    ),
  );
}

async function failureOf(promise: Promise<unknown>): Promise<MailNotSent> {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  if (!(error instanceof MailNotSent))
    throw new Error(`expected MailNotSent, got ${String(error)}`);
  return error;
}

describe('deliver, when Resend refuses a message', () => {
  it.each([['daily_quota_exceeded'], ['monthly_quota_exceeded'], ['rate_limit_exceeded']])(
    'throws MailNotSent carrying status 429 and the name %s',
    async (name) => {
      resendAnswers(429, name);

      const error = await failureOf(deliver(MESSAGE));

      expect(error).toMatchObject({ name: 'MailNotSent', status: 429, code: name });
    },
  );

  it('carries any other status, and the name Resend gave it', async () => {
    resendAnswers(422, 'validation_error');

    expect(await failureOf(deliver(MESSAGE))).toMatchObject({
      status: 422,
      code: 'validation_error',
    });
  });

  it('carries a null name when the error body is not Resend’s JSON', async () => {
    server.use(
      http.post(
        'https://api.resend.com/emails',
        () => new HttpResponse('Bad gateway', { status: 502 }),
      ),
    );

    expect(await failureOf(deliver(MESSAGE))).toMatchObject({ status: 502, code: null });
  });

  it('carries a null status and name when the transport could not be reached', async () => {
    server.use(http.post('https://api.resend.com/emails', () => HttpResponse.error()));

    expect(await failureOf(deliver(MESSAGE))).toMatchObject({ status: null, code: null });
  });
});

describe('MailNotSent', () => {
  it('defaults its status and name to null when built with a message alone', () => {
    const error = new MailNotSent('mailpit answered 503');

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ message: 'mailpit answered 503', status: null, code: null });
  });

  it('takes the status and name as its second argument', () => {
    expect(
      new MailNotSent('resend answered 429', { status: 429, code: 'monthly_quota_exceeded' }),
    ).toMatchObject({ status: 429, code: 'monthly_quota_exceeded' });
  });
});
