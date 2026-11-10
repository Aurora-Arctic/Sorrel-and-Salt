import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SupportRequestByLink from '@/components/SupportRequestByLink';
import type {
  SupportRequestByViewTokenQuery,
  SupportRequestByViewTokenQueryVariables,
} from '@/gql/graphql';
import { graphqlLink, mockGraphQLError, mockGraphQLQuery } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// claude-docs/design-decisions/support.md, "A signed-out sender reaches their request by a mailed link"

vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
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

  it('counts a reply as unsaved only when it has more than whitespace', async () => {
    answered();
    window.sessionStorage.setItem(KEY, 'stored-token');
    render(<SupportRequestByLink />);
    const box = await screen.findByRole('textbox', { name: 'Your Reply' });
    const leavingAsks = (): boolean => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    fireEvent.change(box, { target: { value: '   ' } });
    expect(leavingAsks()).toBe(false);
    fireEvent.change(box, { target: { value: 'Noted.' } });
    expect(leavingAsks()).toBe(true);
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

describe('SupportRequestByLink, while the request is read', () => {
  // A test that stops early still lets the held answer go before happy-dom waits on the request, so it holds up no later test.
  let release = () => {};
  afterEach(() => release());

  // The read is a round trip: the page holds a skeleton of the request beside the one status saying it is opening.
  it('draws one status with a skeleton beside it until the request arrives', async () => {
    const held = new Promise<void>((resolve) => (release = resolve));
    let requested = false;
    server.use(
      graphqlLink.query('SupportRequestByViewToken', async () => {
        requested = true;
        await held;
        return HttpResponse.json({ data: FOUND });
      }),
    );
    at('/support/request#fragment-token');

    const { container } = render(<SupportRequestByLink />);

    // Precondition: the read is out, so the page is waiting on it.
    await waitFor(() => expect(requested).toBe(true));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    // The skeleton is drawn for the eye alone, so it is found by being hidden from assistive technology.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    // The waiting region says it is still loading, as every loading region does (claude-docs/loading.md).
    expect(screen.getByRole('generic', { busy: true })).toContainElement(
      screen.getByRole('status'),
    );

    release();

    expect(await screen.findByRole('heading', { name: SUBJECT })).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('generic', { busy: true })).toBeNull();
  });
});
