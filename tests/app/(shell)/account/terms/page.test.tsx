import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';
import { requireSession, sessionAgreedVersion } from '../../../../support/request-session';
import { renderWithQuery } from '../../../../support/render-with-query';

// The terms acceptance page: kept out of search results, and drawn only for a signed-in account. The
// session, the account's stored agreement and the documents in force are mocked; who is sent here is tests/lib/request-session.test.ts's.

vi.mock('@/lib/request-session', () => import('../../../../support/request-session'));

const signedInLanding = vi.fn(async () => '/coven/fixture-coven');
vi.mock('@/lib/landing', () => ({ signedInLanding }));

const readDocument = vi.fn();
// Terms 3, disclaimer 2, code of ethics 1.
const IN_FORCE = { terms: 3, disclaimer: 2, ethics: 1 };
const agreementVersionInForce = vi.fn(async () => IN_FORCE);
vi.mock('@/modules/documents', () => ({ readDocument, agreementVersionInForce }));

const { default: TermsPage, metadata } = await import('@/app/(shell)/account/terms/page');

const SESSION = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'user' } as Session;

beforeEach(() => {
  requireSession.mockReset();
  sessionAgreedVersion.mockResolvedValue({ terms: null, disclaimer: null, ethics: null });
  readDocument.mockResolvedValue({ number: 3, publishedAt: new Date('2026-05-06T00:00:00Z') });
});

describe('the /account/terms page', () => {
  // The public Terms of Use link here, and a signed-out crawler is sent on to sign-in.
  it('asks a search engine neither to index it nor to follow its links', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('offers a signed-in account the agreement, read with its session', async () => {
    requireSession.mockResolvedValue(SESSION);

    const page = await TermsPage({ searchParams: Promise.resolve({}) });
    renderWithQuery(page);

    expect(requireSession).toHaveBeenCalledOnce();
    expect(signedInLanding).toHaveBeenCalledWith(SESSION);
    expect(screen.getByRole('button', { name: 'Agree & Continue' })).toBeInTheDocument();
  });

  // Only the disclaimer moved on since this account agreed.
  it('links only the document that changed since the account last agreed', async () => {
    requireSession.mockResolvedValue(SESSION);
    sessionAgreedVersion.mockResolvedValue({ ...IN_FORCE, disclaimer: 1 });

    const page = await TermsPage({ searchParams: Promise.resolve({}) });
    renderWithQuery(page);

    const changed = within(screen.getByRole('list')).getAllByRole('link');
    expect(changed.map((link) => link.getAttribute('href'))).toEqual(['/disclaimer']);
  });

  it('draws nothing for a signed-out visitor, whom the session read sends to sign-in', async () => {
    requireSession.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(TermsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_REDIRECT');
  });
});
