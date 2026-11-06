import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupportRequestByLink from '@/components/SupportRequestByLink';
import type {
  SupportRequestByViewTokenQuery,
  SupportRequestByViewTokenQueryVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLQuery } from '../../support/msw/graphql';

// The mailed-link page's reader. The token arrives in the URL fragment, leaves the address bar once read, and is kept in
// this tab's sessionStorage, so a reload in the same tab opens the request again and a new tab does not. A token the
// server no longer honours is dropped from storage (claude-docs/design-decisions/m15.48-mailed-link.md).

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/support/request',
}));

/** The sessionStorage key the page keeps the token under. */
const KEY = 'support-view-token';
const SUBJECT = 'The Testwort jar will not open';

const FOUND: SupportRequestByViewTokenQuery = {
  supportRequestByViewToken: {
    id: 'r1',
    about: 'account' as SupportRequestByViewTokenQuery['supportRequestByViewToken']['about'],
    status: 'open' as SupportRequestByViewTokenQuery['supportRequestByViewToken']['status'],
    subject: SUBJECT,
    message: 'It sticks at the lid.',
    createdAt: '2026-11-01T09:00:00Z',
    replies: [],
  },
};

/** Answers the query with the request and records each token it was asked with. */
function answered(): string[] {
  const asked: string[] = [];
  mockGraphQLQuery<SupportRequestByViewTokenQuery, SupportRequestByViewTokenQueryVariables>(
    'SupportRequestByViewToken',
    ({ token }) => {
      asked.push(token);
      return FOUND;
    },
  );
  return asked;
}

const at = (url: string) => window.history.replaceState(null, '', url);

beforeEach(() => {
  window.sessionStorage.clear();
  at('/support/request');
});

describe('SupportRequestByLink', () => {
  it('reads the token from the fragment over a stored one, clears the fragment, and keeps the new token', async () => {
    const asked = answered();
    window.sessionStorage.setItem(KEY, 'stored-token');
    at('/support/request#fragment-token');

    render(<SupportRequestByLink />);

    expect(await screen.findByRole('heading', { name: SUBJECT })).toBeInTheDocument();
    expect(asked).toEqual(['fragment-token']);
    expect(window.location.hash).toBe('');
    expect(window.sessionStorage.getItem(KEY)).toBe('fragment-token');
  });

  it('opens the request from the stored token when there is no fragment, as a reload in the tab does', async () => {
    const asked = answered();
    window.sessionStorage.setItem(KEY, 'stored-token');

    render(<SupportRequestByLink />);

    expect(await screen.findByRole('heading', { name: SUBJECT })).toBeInTheDocument();
    expect(asked).toEqual(['stored-token']);
  });

  it('asks for nothing and shows no request with neither a fragment nor a stored token', async () => {
    const asked = answered();

    render(<SupportRequestByLink />);

    expect(await screen.findByRole('heading')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: SUBJECT })).toBeNull();
    expect(asked).toEqual([]);
  });

  it('drops the stored token once the server answers not-found', async () => {
    mockGraphQLError('SupportRequestByViewToken', { code: 'NOT_FOUND' });
    window.sessionStorage.setItem(KEY, 'stale-token');

    render(<SupportRequestByLink />);

    await waitFor(() => expect(window.sessionStorage.getItem(KEY)).toBeNull());
    expect(screen.queryByRole('heading', { name: SUBJECT })).toBeNull();
  });
});
