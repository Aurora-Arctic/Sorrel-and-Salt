'use client';

import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import { statusBadgeClass } from '../SupportRequests/status-badge';
import type { SupportAbout, SupportStatus } from '../SupportRequests/types';
import Skeleton from '../Skeleton';
import SupportSenderRequest from '../SupportSenderRequest';
import { senderStatusLabel } from '../SupportSenderRequest/status';
import SupportViewReplyForm from '../SupportViewReplyForm';
import type { LinkedRequest, LinkState } from './types';
import { PendingLink } from '../../lib/navigation';

// The token is in the URL fragment, which the browser never sends: it is read here, kept in sessionStorage and dropped from the address bar.

const SupportRequestByViewTokenDocument = graphql(`
  query SupportRequestByViewToken($token: String!) {
    supportRequestByViewToken(token: $token) {
      id
      about
      status
      subject
      message
      sentAt
      replies {
        id
        authorRole
        body
        sentAt
      }
    }
  }
`);

const NOT_FOUND = 'NOT_FOUND';
const STORAGE_KEY = 'support-view-token';

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage is blocked: the page falls back to showing not-found on a reload.
  }
}

const SupportRequestByLink = (): ReactElement => {
  const [state, setState] = useState<LinkState>({ phase: 'loading' });
  // Kept across renders: the fragment is cleared once read, so a second effect run would find none.
  const token = useRef<string | null>(null);

  const load = useCallback(async (): Promise<LinkState> => {
    if (!token.current) return { phase: 'missing' };
    try {
      const { supportRequestByViewToken: found } = await graphqlRequest(
        SupportRequestByViewTokenDocument,
        { token: token.current },
      );
      const request: LinkedRequest = {
        ...found,
        about: found.about as SupportAbout,
        status: found.status as SupportStatus,
        createdAt: new Date(found.sentAt),
        replies: found.replies.map((reply) => ({
          id: reply.id,
          body: reply.body,
          createdAt: new Date(reply.sentAt),
          fromSender: reply.authorRole === 'sender',
        })),
      };
      return { phase: 'found', request };
    } catch (error) {
      if (readGraphqlFailureCode(error) === NOT_FOUND) {
        writeStored(null);
        return { phase: 'missing' };
      }
      return { phase: 'failed', message: readGraphqlFailure(error).alert ?? GENERIC_FAILURE };
    }
  }, []);

  useEffect(() => {
    if (token.current === null) {
      const fragment = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (fragment !== '') {
        token.current = fragment;
        writeStored(fragment);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        token.current = readStored();
      }
    }
    let current = true;
    void load().then((next) => {
      if (current) setState(next);
    });
    return () => {
      current = false;
    };
  }, [load]);

  // A newer link pasted into the open tab changes the hash without remounting; an empty hash is ignored.
  useEffect(() => {
    let current = true;
    const onHashChange = () => {
      const fragment = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (fragment === '') return;
      token.current = fragment;
      writeStored(fragment);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setState({ phase: 'loading' });
      void load().then((next) => {
        if (current) setState(next);
      });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      current = false;
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [load]);

  // The one status announces the wait; the quiet skeleton beside it is for the eye alone.
  if (state.phase === 'loading') {
    return (
      <div className="page-with-nav">
        <p role="status">Opening your request.</p>
        <Skeleton shape="line" count={4} quiet />
      </div>
    );
  }
  if (state.phase === 'failed') return <Notice kind="error">{state.message}</Notice>;
  if (state.phase === 'missing') {
    return (
      <div className="page-with-nav">
        <PageHeader title="Request Not Found or Closed" />
        <p>
          This link doesn’t open a request. The request may be closed, or this may not be the newest
          link. Only the link in the latest email we sent works, and a link stops working after 30
          days. To ask something new, <PendingLink href="/support">send a new request</PendingLink>.
        </p>
      </div>
    );
  }

  const { request } = state;
  const about =
    SUPPORT_ABOUTS.find((option) => option.value === request.about)?.label ?? request.about;
  const staffWroteLast = request.replies[request.replies.length - 1]?.fromSender === false;
  return (
    <div className="page-with-nav">
      <PageHeader eyebrow={`Support · ${about}`} title={request.subject} />
      <div className="badges">
        <span className={statusBadgeClass(request.status)}>
          {senderStatusLabel(request.status, staffWroteLast)}
        </span>
      </div>
      <SupportSenderRequest
        request={{ ...request, path: null, errorCode: null, followUpId: null, timedOut: null }}
        reply={
          <SupportViewReplyForm
            token={token.current ?? ''}
            onSent={() => void load().then(setState)}
          />
        }
      />
    </div>
  );
};

function readGraphqlFailureCode(error: unknown): string | undefined {
  const errors = (error as { errors?: readonly { extensions?: { code?: string } }[] }).errors;
  return errors?.[0]?.extensions?.code;
}

export default SupportRequestByLink;
