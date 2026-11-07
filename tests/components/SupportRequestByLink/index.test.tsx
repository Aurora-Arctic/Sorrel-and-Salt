import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupportRequestByLink from '@/components/SupportRequestByLink';
import type {
  SupportRequestByViewTokenQuery,
  SupportRequestByViewTokenQueryVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLQuery } from '../../support/msw/graphql';

// claude-docs/design-decisions/m15.48-mailed-link.md

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/support/request',
}));

const KEY = 'support-view-token';
const SUBJECT = 'The Testwort jar will not open';

const FOUND: SupportRequestByViewTokenQuery = {
  supportRequestByViewToken: {
    id: 'r1',
    about: 'account' as SupportRequestByViewTokenQuery['supportRequestByViewToken']['about'],
    status: 'open' as SupportRequestByViewTokenQuery['supportRequestByViewToken']['status'],
    subject: SUBJECT,
    message: 'It sticks at the lid.',
    sentAt: '2026-11-01T09:00:00Z',
    replies: [],
  },
};

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

function answeredPerToken(subjects: Record<string, string>): string[] {
  const asked: string[] = [];
  mockGraphQLQuery<SupportRequestByViewTokenQuery, SupportRequestByViewTokenQueryVariables>(
    'SupportRequestByViewToken',
    ({ token }) => {
      asked.push(token);
      return {
        supportRequestByViewToken: {
          ...FOUND.supportRequestByViewToken,
          id: token,
          subject: subjects[token] ?? SUBJECT,
        },
      };
    },
  );
  return asked;
}

function pasteLink(token: string) {
  act(() => {
    window.location.hash = token;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
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

  describe('a newer link pasted into the open tab', () => {
    const SECOND = 'The second Testwort jar';

    it('opens its request over the one shown, clears the fragment and keeps the new token', async () => {
      const asked = answeredPerToken({ 'first-token': SUBJECT, 'second-token': SECOND });
      at('/support/request#first-token');
      render(<SupportRequestByLink />);
      expect(await screen.findByRole('heading', { name: SUBJECT })).toBeInTheDocument();

      pasteLink('second-token');

      expect(await screen.findByRole('heading', { name: SECOND })).toBeInTheDocument();
      expect(asked).toEqual(['first-token', 'second-token']);
      expect(window.location.hash).toBe('');
      expect(window.sessionStorage.getItem(KEY)).toBe('second-token');
    });

    it('opens its request from the not-found state', async () => {
      const asked = answeredPerToken({ 'second-token': SECOND });
      render(<SupportRequestByLink />);
      expect(await screen.findByRole('heading')).toBeInTheDocument();
      // Precondition: the tab showed no request and asked for none.
      expect(screen.queryByRole('heading', { name: SECOND })).toBeNull();
      expect(asked).toEqual([]);

      pasteLink('second-token');

      expect(await screen.findByRole('heading', { name: SECOND })).toBeInTheDocument();
      expect(asked).toEqual(['second-token']);
      expect(window.location.hash).toBe('');
      expect(window.sessionStorage.getItem(KEY)).toBe('second-token');
    });
  });
});
