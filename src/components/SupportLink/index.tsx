'use client';

import type { Route } from 'next';
import { usePathname, useSearchParams } from 'next/navigation';
import { ModalLink } from '../Modal';
import { Suspense, type ReactElement } from 'react';
import { SUPPORT_PARAM, SUPPORT_PATH, supportHref } from '../../lib/support-path';
import type { SupportLinkProps } from './types';

// Both are `nofollow`: each copies a page with the dialog asked for, and robots.txt blocks the home page's copy, `/?support=`.

function Opening({ children, about, ...rest }: SupportLinkProps): ReactElement {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <ModalLink
      {...rest}
      rel="nofollow"
      href={supportHref(pathname, new URLSearchParams(params), about) as Route}
    >
      {children}
    </ModalLink>
  );
}

const SupportLink = ({ children, about, ...rest }: SupportLinkProps): ReactElement => {
  const fallback = (
    <ModalLink
      {...rest}
      rel="nofollow"
      href={about ? `${SUPPORT_PATH}?${SUPPORT_PARAM}=${about}` : SUPPORT_PATH}
    >
      {children}
    </ModalLink>
  );
  return (
    <Suspense fallback={fallback}>
      <Opening about={about} {...rest}>
        {children}
      </Opening>
    </Suspense>
  );
};

export default SupportLink;
