'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { Suspense, type ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { RouteModal } from '../Modal';
import Notice from '../Notice';
import SupportForm from '../SupportForm';
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
import { emailPagePath } from '../../lib/account-email';
import type { SupportDialogProps } from './types';

// The Support dialog, open while the address carries `?support=<about>` on any page in the shell, with
// `?error=<status>` when it comes from an error page. Drawn once in the shell; closing drops the
// parameters and keeps the page (claude-docs/components/support-dialog.md).

function Dialog({ verified }: SupportDialogProps): ReactElement | null {
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get(SUPPORT_PARAM);
  if (asked === null) return null;
  const closeHref = supportClosedHref(pathname, new URLSearchParams(params)) as Route;
  const errorCode = errorCodeOf(params.get(SUPPORT_ERROR_PARAM));
  const errorReference = errorReferenceOf(params.get(SUPPORT_REF_PARAM));
  const path = params.get(SUPPORT_FROM_PARAM) ?? pathname;
  return (
    <RouteModal
      closeHref={closeHref}
      content={{
        heading: { title: 'Contact Support' },
        body: (done) =>
          verified ? (
            <SupportForm
              about={supportAboutOf(asked)}
              errorCode={errorCode}
              errorReference={errorReference}
              path={path}
              onDone={done}
            />
          ) : (
            <Notice kind="plain">
              Confirm your email address before you write to us.{' '}
              <Link href={emailPagePath(undefined)}>Go to Your Email</Link>
            </Notice>
          ),
      }}
    />
  );
}

/** In a Suspense boundary, as reading the address asks for. */
const SupportDialog = (props: SupportDialogProps): ReactElement => (
  <Suspense fallback={null}>
    <Dialog {...props} />
  </Suspense>
);

export default SupportDialog;
