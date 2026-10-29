'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { stopImpersonating } from '../../lib/auth-client';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import type { ImpersonationBannerProps } from './types';
import './index.scss';

// The way out, on every page while a session is an impersonation. It cannot live in the
// admin nav: impersonating a non-admin costs the admin `/admin` until they stop
// (claude-docs/components/impersonation-banner.md).

// Where the admin picked the user, as a full load: the session cookie is the
// admin's again, and every server component must read it afresh.
const RETURN_TO = '/admin/users';

const STOP_FAILED = "Impersonation didn't stop. Please try again, or sign out to end it.";

// The banner's height, published on the root for the top inset, which counts
// it only on a touch screen, where the banner sits in the page's flow
// (index.scss; claude-docs/styling.md, "The top inset").
const HEIGHT_PROPERTY = '--impersonation-banner-height';

const ImpersonationBanner = ({ name, email }: ImpersonationBannerProps): ReactElement => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const banner = useRef<HTMLElement>(null);
  const { anchorRef, report, feedback } = useClickFeedback({ name: 'Stop Impersonating' });

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
    // `aria-disabled` lets a click through, so a second one is refused here.
    if (pending) return;
    setPending(true);
    setFailed(false);
    report(undefined);
    // A refusal answers `error`; a dropped connection throws. Either says so.
    const { error } = await stopImpersonating().catch((thrown: unknown) => ({ error: thrown }));
    if (error) {
      setPending(false);
      setFailed(true);
      // In a callout under the button (claude-docs/components/click-feedback.md).
      report(STOP_FAILED);
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
      {/* Busy until the admin's own page opens. `aria-disabled` rather than `disabled`,
                which would drop the focus to the page and leave a keyboard nowhere. */}
      <BusyButton
        ref={anchorRef}
        className="btn btn--quiet btn--small"
        aria-disabled={pending || undefined}
        busy={pending}
        busyLabel="Stopping"
        onClick={() => void stop()}
      >
        Stop Impersonating
      </BusyButton>
      {feedback}
    </aside>
  );
};

export default ImpersonationBanner;
