import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResetPasswordFormProps } from '@/components/ResetPasswordForm/types';

// /reset-password hands the form the token Better Auth's link opened it with, and none when the link said
// the token was spent or expired, so the form offers a new link. The form is mocked to read what it is handed.

const handed = vi.fn<(props: ResetPasswordFormProps) => void>();
vi.mock('@/components/ResetPasswordForm', () => ({
  default: (props: ResetPasswordFormProps) => {
    handed(props);
    return null;
  },
}));

const { default: ResetPasswordPage } = await import('@/app/reset-password/page');

const visit = async (params: { token?: string | string[]; error?: string }) =>
  render(await ResetPasswordPage({ searchParams: Promise.resolve(params) }));

beforeEach(() => {
  handed.mockReset();
});

describe('/reset-password', () => {
  it('hands the form the token the link carried', async () => {
    await visit({ token: 'tok' });

    expect(handed).toHaveBeenCalledWith({ token: 'tok' });
  });

  it.each([
    ['an expired or spent token', { error: 'INVALID_TOKEN' }],
    ['an error beside a token', { token: 'tok', error: 'INVALID_TOKEN' }],
    ['no token', {}],
    ['an empty token', { token: '' }],
    ['a repeated token', { token: ['tok', 'other'] }],
  ])('hands the form no token for %s', async (_, params) => {
    await visit(params);

    expect(handed).toHaveBeenCalledWith({ token: undefined });
  });
});
