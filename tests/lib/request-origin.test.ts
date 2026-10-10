import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestOrigin } from '@/lib/request-origin';

// The origin both mail senders build their link on. Better Auth's resolver is
// mocked: which hosts it allows is tests/lib/auth.test.ts's "baseURL", and
// the link a real request gets is the senders' own tests'.
const resolveBaseURL = vi.fn();
const BASE_URL = { allowedHosts: ['sorrelandsalt.com'], fallback: 'https://sorrelandsalt.com' };

vi.mock('@/lib/auth', () => ({ auth: { options: { baseURL: BASE_URL } } }));
vi.mock('better-auth', () => ({ resolveBaseURL }));

describe('requestOrigin', () => {
  const request = new Request('https://staging.sorrelandsalt.com/api/graphql');

  beforeEach(() => {
    resolveBaseURL.mockReset();
  });

  it("resolves the request against Better Auth's own base URL, under the path", async () => {
    resolveBaseURL.mockReturnValue('https://staging.sorrelandsalt.com/api/auth');

    await expect(requestOrigin(request, '/api/auth')).resolves.toBe(
      'https://staging.sorrelandsalt.com/api/auth',
    );
    expect(resolveBaseURL).toHaveBeenCalledWith(BASE_URL, '/api/auth', request);
  });

  it('throws rather than build a link on no origin', async () => {
    resolveBaseURL.mockReturnValue(undefined);

    await expect(requestOrigin(request, '/')).rejects.toThrow(
      'No origin to build a mailed link on',
    );
  });
});
