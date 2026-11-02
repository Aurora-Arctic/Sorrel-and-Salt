import { describe, expect, it, vi } from 'vitest';

// /forgot-password is public and reachable signed in, so it keeps itself out of a search index through its
// metadata. The form is mocked: only the page module's metadata is read.

vi.mock('@/components/ForgotPasswordForm', () => ({ default: () => null }));

const { metadata } = await import('@/app/forgot-password/page');

describe('/forgot-password', () => {
  it('asks search engines not to index it', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});
