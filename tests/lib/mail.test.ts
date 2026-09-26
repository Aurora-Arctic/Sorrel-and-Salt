import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../support/msw/server';
import { send } from '@/lib/mail';

const MESSAGE = {
  to: 'recipient@example.test',
  subject: 'Verify your email',
  text: 'Follow this link.',
  html: '<p>Follow this link.</p>',
};

const MAILPIT_URL = 'http://mailpit.test:8025';
const MAILTRAP_SANDBOX_ID = '4242';

type Captured = { url: string; headers: Headers; body: unknown };

// Every request `send` makes, whatever its URL. MSW's `onUnhandledRequest:
// 'error'` is not enough to prove nothing was sent: `send` swallows errors by
// design, so an unhandled request would be logged and the test would pass.
let requests: Captured[];
let responseStatus: number;

function captureEverything() {
  server.use(
    http.all('*', async ({ request }) => {
      requests.push({
        url: request.url,
        headers: request.headers,
        body: await request.json().catch(() => undefined),
      });
      return HttpResponse.json({}, { status: responseStatus });
    }),
  );
}

// Every variable `send` reads, blank, so a developer's shell cannot decide a
// test; `send` treats '' as unset.
function clearMailEnv() {
  for (const name of [
    'VERCEL_ENV',
    'MAIL_TRANSPORT',
    'MAIL_FROM',
    'RESEND_API_KEY',
    'MAILTRAP_SANDBOX_TOKEN',
    'MAILTRAP_SANDBOX_ID',
    'MAILPIT_URL',
  ]) {
    vi.stubEnv(name, '');
  }
}

function configure(transport: 'resend' | 'mailtrap-sandbox' | 'mailpit') {
  vi.stubEnv('MAIL_TRANSPORT', transport);
  if (transport === 'resend') {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('MAIL_FROM', 'Sorrel & Salt <noreply@sorrelandsalt.com>');
  } else if (transport === 'mailtrap-sandbox') {
    vi.stubEnv('MAILTRAP_SANDBOX_TOKEN', 'mailtrap-test-token');
    vi.stubEnv('MAILTRAP_SANDBOX_ID', MAILTRAP_SANDBOX_ID);
  } else {
    vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  }
}

let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  requests = [];
  responseStatus = 200;
  captureEverything();
  clearMailEnv();
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('send, per transport', () => {
  it('posts to Resend with the bearer key and the configured from-address', async () => {
    configure('resend');

    await send(MESSAGE);

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.url).toBe('https://api.resend.com/emails');
    expect(request.headers.get('authorization')).toBe('Bearer re_test_key');
    expect(request.body).toEqual({
      from: 'Sorrel & Salt <noreply@sorrelandsalt.com>',
      to: [MESSAGE.to],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
    expect(error).not.toHaveBeenCalled();
  });

  it('posts to the Mailtrap Sandbox send API for the configured sandbox', async () => {
    configure('mailtrap-sandbox');

    await send(MESSAGE);

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.url).toBe(`https://sandbox.api.mailtrap.io/api/send/${MAILTRAP_SANDBOX_ID}`);
    expect(request.headers.get('api-token')).toBe('mailtrap-test-token');
    expect(request.body).toEqual({
      from: { email: 'noreply@sorrelandsalt.com', name: 'Sorrel & Salt' },
      to: [{ email: MESSAGE.to }],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
    expect(error).not.toHaveBeenCalled();
  });

  it("posts to Mailpit's send API", async () => {
    configure('mailpit');

    await send(MESSAGE);

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.url).toBe(`${MAILPIT_URL}/api/v1/send`);
    expect(request.body).toEqual({
      From: { Email: 'noreply@sorrelandsalt.com', Name: 'Sorrel & Salt' },
      To: [{ Email: MESSAGE.to }],
      Subject: MESSAGE.subject,
      Text: MESSAGE.text,
      HTML: MESSAGE.html,
    });
    expect(error).not.toHaveBeenCalled();
  });
});

describe('the environment guard', () => {
  // Each refusal is paired with the same environment sending on its permitted
  // value, so a refusal cannot pass merely because that environment sends
  // nothing at all.
  it('refuses Mailpit in production, logging and sending nothing', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    configure('mailpit');

    await send(MESSAGE);

    expect(requests).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('refused MAIL_TRANSPORT=mailpit'));
  });

  it('sends through Resend in production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    configure('resend');

    await send(MESSAGE);

    expect(requests.map((request) => request.url)).toEqual(['https://api.resend.com/emails']);
  });

  it('refuses Resend in a preview, logging and sending nothing', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    configure('resend');

    await send(MESSAGE);

    expect(requests).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('refused MAIL_TRANSPORT=resend'));
  });

  it('sends through the Mailtrap Sandbox in a preview', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    configure('mailtrap-sandbox');

    await send(MESSAGE);

    expect(requests.map((request) => request.url)).toEqual([
      `https://sandbox.api.mailtrap.io/api/send/${MAILTRAP_SANDBOX_ID}`,
    ]);
  });

  it('refuses an unset transport in production rather than logging the message', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    await send(MESSAGE);

    expect(requests).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('refused MAIL_TRANSPORT=(unset)'));
    expect(info).not.toHaveBeenCalled();
  });
});

describe('when nothing can be sent', () => {
  it('logs the message and sends nothing when MAIL_TRANSPORT is unset', async () => {
    await send(MESSAGE);

    expect(requests).toHaveLength(0);
    expect(info).toHaveBeenCalledWith(expect.stringContaining('MAIL_TRANSPORT is unset'), MESSAGE);
    expect(error).not.toHaveBeenCalled();
  });

  it('logs an unrecognised transport and sends nothing', async () => {
    vi.stubEnv('MAIL_TRANSPORT', 'smtp');

    await send(MESSAGE);

    expect(requests).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('MAIL_TRANSPORT=smtp'));
  });

  it.each([
    ['resend', 'RESEND_API_KEY'],
    ['resend', 'MAIL_FROM'],
    ['mailtrap-sandbox', 'MAILTRAP_SANDBOX_TOKEN'],
    ['mailtrap-sandbox', 'MAILTRAP_SANDBOX_ID'],
    ['mailpit', 'MAILPIT_URL'],
  ] as const)('logs %s without %s and sends nothing', async (transport, missing) => {
    configure(transport);
    vi.stubEnv(missing, '');

    await send(MESSAGE);

    expect(requests).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining(missing));
  });

  it('logs an error response and does not throw', async () => {
    configure('resend');
    responseStatus = 500;

    await expect(send(MESSAGE)).resolves.toBeUndefined();

    // The request was made, so the log is the response's, not a refusal's.
    expect(requests).toHaveLength(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('500'));
  });

  it('logs a network failure and does not throw', async () => {
    configure('mailpit');
    server.use(http.post(`${MAILPIT_URL}/api/v1/send`, () => HttpResponse.error()));

    await expect(send(MESSAGE)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('mailpit send failed'),
      expect.any(Error),
    );
  });
});
