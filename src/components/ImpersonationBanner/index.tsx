'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { stopImpersonating } from '../../lib/auth-client';
import type { ImpersonationBannerProps } from './types';
import './index.scss';

// MB.53's way out, on every page while a session is an impersonation. It
// cannot live in the admin nav: impersonating a non-admin costs the admin
// `/admin` until they stop (claude-docs/components/impersonation-banner.md).

// Where the admin picked the user, as a full load: the session cookie is the
// admin's again, and every server component must read it afresh.
const RETURN_TO = '/admin/users';

// The banner's height, published on the root for the top inset, which counts
// it only on a touch screen, where the banner sits in the page's flow
// (index.scss; claude-docs/styling.md, "The top inset").
const HEIGHT_PROPERTY = '--impersonation-banner-height';

const ImpersonationBanner = ({ name, email }: ImpersonationBannerProps): ReactElement => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const banner = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = banner.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(HEIGHT_PROPERTY, `${element.offsetHeight}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(HEIGHT_PROPERTY);
    };
  }, []);

  async function stop() {
    setPending(true);
    setFailed(false);
    const { error } = await stopImpersonating();
    if (error) {
      setPending(false);
      setFailed(true);
      return;
    }
    window.location.assign(RETURN_TO);
  }

  return (
    // Held open while Stop is in flight or has failed (index.scss).
    <aside
      ref={banner}
      className={`impersonation-banner${pending || failed ? ' impersonation-banner--open' : ''}`}
      aria-label="Impersonation"
    >
      <p className="impersonation-banner__text">
        You are impersonating <strong>{name}</strong> ({email}).
      </p>
      <button className="btn btn--quiet btn--small" type="button" disabled={pending} onClick={stop}>
        Stop Impersonating
      </button>
      {failed && (
        <p className="notice notice--error" role="alert">
          Impersonation could not be stopped. Signing out ends it too.
        </p>
      )}
    </aside>
  );
};

export default ImpersonationBanner;
