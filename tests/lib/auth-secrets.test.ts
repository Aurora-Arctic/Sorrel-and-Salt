import { describe, expect, it } from 'vitest';
import { verificationSigningSecret } from '@/lib/auth-secrets';

const env = (values: Record<string, string>) =>
  ({ NODE_ENV: 'test', ...values }) as NodeJS.ProcessEnv;

// The secret a job's step signs a verification link with, chosen as Better Auth chooses its own `ctx.secret`.

describe('verificationSigningSecret', () => {
  it('takes the newest of BETTER_AUTH_SECRETS over BETTER_AUTH_SECRET', () => {
    expect(
      verificationSigningSecret(
        env({
          BETTER_AUTH_SECRETS: '2:testwort-newest, 1:testwort-older',
          BETTER_AUTH_SECRET: 'testwort-single',
        }),
      ),
    ).toBe('testwort-newest');
  });

  it('takes BETTER_AUTH_SECRET alone when no list is set', () => {
    expect(verificationSigningSecret(env({ BETTER_AUTH_SECRET: 'testwort-single' }))).toBe(
      'testwort-single',
    );
  });

  it("falls back to Better Auth's own default when nothing is set", () => {
    expect(verificationSigningSecret(env({}))).toBe('better-auth-secret-12345678901234567890');
  });
});
