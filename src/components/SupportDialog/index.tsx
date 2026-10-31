'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Suspense, type ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { graphql } from '../../gql';
import { graphqlQuery } from '../../lib/graphql-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import { RouteModal } from '../Modal';
import Notice from '../Notice';
import Skeleton from '../Skeleton';
import SupportPanel from '../SupportPanel';
import {
  SUPPORT_ERROR_PARAM,
  SUPPORT_REF_PARAM,
  errorReferenceOf,
  SUPPORT_FROM_PARAM,
  SUPPORT_PARAM,
  errorCodeOf,
  supportClosedHref,
  supportAboutOf,
} from '../../lib/support-path';
import { useActualPathname } from '../../lib/use-actual-pathname';
import { emailPagePath } from '../../lib/account-email';
import type { SupportPanelState } from '../SupportPanel/types';
import type { SupportDialogState } from './types';

// The Support dialog, open while the address carries `?support=<about>` on any page, with
// `?error=<status>` when it comes from an error page. Drawn once by the root layout, which reads nothing
// for it: the dialog asks what the visitor may do when it opens, through /api/graphql. Closing drops the
// parameters and keeps the page (claude-docs/components/support-dialog.md).

const SupportDialogStateDocument = graphql(`
  query SupportDialogState {
    supportDialogState {
      kind
      until
    }
  }
`);

function Dialog(): ReactElement | null {
  const routed = usePathname();
  // The address bar, since the router answers `/_not-found` on a 404 and a request must name the real page.
  const pathname = useActualPathname() ?? routed;
  const params = useSearchParams();
  const asked = params.get(SUPPORT_PARAM);
  // Asked on every open, never reused: a visitor may have signed in or been timed out since.
  const answer = useQuery({
    ...graphqlQuery(SupportDialogStateDocument),
    enabled: asked !== null,
    staleTime: 0,
    gcTime: 0,
    throwOnError: false,
  });
  if (asked === null) return null;
  const found = answer.data?.supportDialogState;
  const state: SupportDialogState | null = !found
    ? null
    : found.kind === 'timedOut' && found.until
      ? { kind: 'timed-out', until: new Date(found.until) }
      : found.kind === 'signedOut'
        ? { kind: 'signed-out' }
        : found.kind === 'unverified'
          ? { kind: 'unverified' }
          : { kind: 'form' };
  const closeHref = supportClosedHref(pathname, new URLSearchParams(params)) as Route;
  const errorCode = errorCodeOf(params.get(SUPPORT_ERROR_PARAM));
  const errorReference = errorReferenceOf(params.get(SUPPORT_REF_PARAM));
  const path = params.get(SUPPORT_FROM_PARAM) ?? pathname;
  const panelState: SupportPanelState | null =
    state === null
      ? null
      : state.kind === 'form'
        ? { kind: 'form', support: supportAboutOf(asked), errorCode, errorReference }
        : state.kind === 'timed-out'
          ? state
          : { kind: 'signed-out' };
  return (
    <RouteModal
      closeHref={closeHref}
      content={{
        heading: { title: 'Contact Support' },
        body: (done) =>
          state === null || panelState === null ? (
            answer.isError ? (
              <Notice kind="error">{GENERIC_FAILURE}</Notice>
            ) : (
              <Skeleton shape="form" />
            )
          ) : state.kind === 'unverified' ? (
            <Notice kind="plain">
              Confirm your email address before you write to us.{' '}
              <Link href={emailPagePath(undefined)}>Go to Your Email</Link>
            </Notice>
          ) : (
            <SupportPanel state={panelState} path={path} returnTo={closeHref} onDone={done} />
          ),
      }}
    />
  );
}

/** In a Suspense boundary, as reading the address asks for. */
const SupportDialog = (): ReactElement => (
  <Suspense fallback={null}>
    <Dialog />
  </Suspense>
);

export default SupportDialog;
