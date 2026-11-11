import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The one handler every Vercel Cron route is: refuse a request without the secret before anything runs, read the
// origin only when the job asks for it, and answer an empty 204 once the job has started.

const requestOrigin = vi.fn();
vi.mock('@/lib/request-origin', () => ({ requestOrigin }));

const { cronRoute } = await import('@/lib/cron-request');

const SECRET = 'test-cron-secret';
const signed = () =>
  new Request('https://fixture.test/api/cron/job', {
    headers: { authorization: `Bearer ${SECRET}` },
  });

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  requestOrigin.mockResolvedValue('https://fixture.test');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('cronRoute', () => {
  it.each([
    ['no authorization header', new Request('https://fixture.test/api/cron/job')],
    [
      'the wrong secret',
      new Request('https://fixture.test/api/cron/job', {
        headers: { authorization: 'Bearer wrong' },
      }),
    ],
  ])(
    'refuses a request with %s as 401, and neither starts the job nor reads the origin',
    async (_case, request) => {
      const job = vi.fn();
      const response = await cronRoute(job)(request);
      expect(response.status).toBe(401);
      expect(job).not.toHaveBeenCalled();
      expect(requestOrigin).not.toHaveBeenCalled();
    },
  );

  it('refuses even a signed request while CRON_SECRET is unset', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const job = vi.fn();
    expect((await cronRoute(job)(signed())).status).toBe(401);
    expect(job).not.toHaveBeenCalled();
  });

  it('starts the job for a signed request and answers 204 with no body', async () => {
    const job = vi.fn().mockResolvedValue({ started: 3 });
    const response = await cronRoute(job)(signed());
    expect(job).toHaveBeenCalledOnce();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('gives the job the origin read against the allowed hosts, for the request it came in on', async () => {
    const request = signed();
    let origin: string | undefined;
    await cronRoute(async (originOf) => {
      origin = await originOf();
    })(request);
    expect(requestOrigin).toHaveBeenCalledWith(request, '/');
    expect(origin).toBe('https://fixture.test');
  });

  it('never reads the origin for a job that does not ask for it', async () => {
    await cronRoute(async () => undefined)(signed());
    expect(requestOrigin).not.toHaveBeenCalled();
  });

  it('lets a failing job fail the request, so Vercel records the run as failed', async () => {
    const route = cronRoute(async () => {
      throw new Error('job failed');
    });
    await expect(route(signed())).rejects.toThrow('job failed');
  });
});
