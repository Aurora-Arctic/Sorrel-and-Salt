'use client';

import Link from 'next/link';
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import { statusBadgeClass } from '../SupportRequests/status-badge';
import type { SupportAbout, SupportStatus } from '../SupportRequests/types';
import SupportSenderRequest from '../SupportSenderRequest';
import { senderStatusLabel } from '../SupportSenderRequest/status';
import SupportViewReplyForm from '../SupportViewReplyForm';
import type { LinkedRequest, LinkState } from './types';

// The page a signed-out sender's mails link to. The mailed link holds its token in the URL fragment, which the browser never
// sends to the server or in a Referer header, so this reads it in the browser, asks `supportRequestByViewToken` for the
// request, and drops the fragment from the address bar. The token is kept in this tab's sessionStorage, not the address bar: it
// lasts for a reload in the tab, is never shared with another tab, and is wiped when the tab closes. A token the server no
// longer honours is removed from storage.

const SupportRequestByViewTokenDocument = graphql(`
  query SupportRequestByViewToken($token: String!) {
    supportRequestByViewToken(token: $token) {
      id
      about
      status
      subject
      message
      createdAt
      replies {
        id
        authorRole
        body
        createdAt
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
        createdAt: new Date(found.createdAt),
        replies: found.replies.map((reply) => ({
          id: reply.id,
          body: reply.body,
          createdAt: new Date(reply.createdAt),
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

  if (state.phase === 'loading') return <p role="status">Opening your request.</p>;
  if (state.phase === 'failed') return <Notice kind="error">{state.message}</Notice>;
  if (state.phase === 'missing') {
    return (
      <div className="page-with-nav">
        <PageHeader title="Request Not Found or Closed" />
        <p>
          This link doesn’t open a request. The request may be closed, or this may not be the newest
          link. Only the link in the latest email we sent works, and a link stops working after 30
          days. To ask something new, <Link href="/support">send a new request</Link>.
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

/** The `extensions.code` of a failed request, if it carries one. */
function readGraphqlFailureCode(error: unknown): string | undefined {
  const errors = (error as { errors?: readonly { extensions?: { code?: string } }[] }).errors;
  return errors?.[0]?.extensions?.code;
}

export default SupportRequestByLink;
