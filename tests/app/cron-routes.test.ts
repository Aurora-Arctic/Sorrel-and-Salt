import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The daily Vercel Cron routes. The job starts are mocked: what a route must prove is that it starts its job for a request
// carrying the secret and for nothing else.
const { startSupportRetention, requestOrigin } = vi.hoisted(() => ({
  startSupportRetention: vi.fn(async (_origin: string) => 'run-id'),
  requestOrigin: vi.fn(async (_request: Request, _path: string) => 'https://sorrelandsalt.com/'),
}));
vi.mock('@/modules/support', () => ({ startSupportRetention }));
vi.mock('@/lib/request-origin', () => ({ requestOrigin }));

const { GET: supportRetention } = await import('@/app/api/cron/support-retention/route');

const SECRET = 'a-test-cron-secret';
const call = (authorization?: string) =>
  new Request('https://sorrelandsalt.com/api/cron/support-retention', {
    headers: authorization === undefined ? {} : { authorization },
  });

beforeEach(() => vi.stubEnv('CRON_SECRET', SECRET));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('the support-retention cron route', () => {
  it('starts the job, linked from the request’s origin, for the bearer secret', async () => {
    const response = await supportRetention(call(`Bearer ${SECRET}`));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(startSupportRetention).toHaveBeenCalledExactlyOnceWith('https://sorrelandsalt.com/');
  });

  it.each([
    ['no header', undefined],
    ['the secret without Bearer', SECRET],
    ['a wrong secret', 'Bearer not-the-secret'],
    ['the secret with more after it', `Bearer ${SECRET}x`],
  ])('refuses %s, and starts nothing', async (_name, authorization) => {
    const response = await supportRetention(call(authorization));

    expect(response.status).toBe(401);
    expect(startSupportRetention).not.toHaveBeenCalled();
  });

  it('refuses every request while CRON_SECRET is unset, the empty bearer included', async () => {
    vi.stubEnv('CRON_SECRET', '');

    for (const authorization of ['Bearer ', `Bearer ${SECRET}`]) {
      expect((await supportRetention(call(authorization))).status).toBe(401);
    }
    expect(startSupportRetention).not.toHaveBeenCalled();
  });
});
