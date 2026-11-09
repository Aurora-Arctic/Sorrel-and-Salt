'use client';

import { type MouseEvent, type ReactElement, useCallback, useRef, useState } from 'react';
import { emailPagePath } from '../../lib/account-email';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { safeReturnPath, signInPath } from '../../lib/sign-in';
import Modal from '../Modal';
import SignInPanel, { LastUsedMark, SignInBack, signInHeader } from '../SignInPanel';
import type { SignInHeader } from '../SignInPanel/types';
import type { SignInDialogProps } from './types';
import './index.scss';

const INBOX_TITLE = 'Check Your Inbox';
const INBOX_LEDE =
  "Your email address isn't confirmed yet. Check your inbox for our message, or press Confirm Your Email to send a new one. Its link brings you back to this page.";

/**
 * Sign In over the page it is on. A link to the sign-in page, so a press for a new tab and a
 * browser without the script get the page; a plain press opens the dialog instead
 * (claude-docs/components/sign-in-dialog.md).
 */
const SignInDialog = ({
  next: asked,
  configured,
  label,
  className = 'btn btn--solid btn--medium',
  mode: openingMode = 'sign-in',
  ledes,
  signUpLandsOnNext,
}: SignInDialogProps): ReactElement => {
  // An auth page is no return path, so from one the panel lands the account by its role.
  const next = safeReturnPath(asked);
  const [open, setOpen] = useState(false);
  // A new email account, signed in by its sign-up, told to check its inbox here rather than sent anywhere.
  const [inbox, setInbox] = useState(false);
  // The panel's head, reported by the panel and drawn in this dialog's header; until the first report, the opening one.
  const [reported, setReported] = useState<{ header: SignInHeader; back: () => void } | null>(null);
  const onHeaderChange = useCallback(
    (header: SignInHeader, back: () => void) => setReported({ header, back }),
    [],
  );
  const header =
    reported?.header ??
    signInHeader({ mode: openingMode, view: 'buttons', lastUsedPassword: false, ledes });
  const { refresh } = usePendingNavigation();
  const link = useRef<HTMLAnchorElement>(null);

  const openDialog = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    setInbox(false);
    setReported(null);
    setOpen(true);
  };

  return (
    <>
      <PendingLink ref={link} className={className} href={signInPath(next)} onClick={openDialog}>
        {label}
      </PendingLink>
      {open && (
        <Modal
          title={inbox ? INBOX_TITLE : header.title}
          aboveName={!inbox && header.back && reported && <SignInBack onBack={reported.back} />}
          focusTitle={!inbox && header.focusTitle}
          headerAlign="center"
          under={
            inbox ? (
              <p className="lede">{INBOX_LEDE}</p>
            ) : (
              <>
                {header.lede && <p className="lede">{header.lede}</p>}
                {header.lastUsed && (
                  <p className="sign-in-panel__last-used-note">
                    <LastUsedMark />
                  </p>
                )}
              </>
            )
          }
          // Nothing typed here is kept, so nothing is asked before it closes. After a sign-up the page
          // is the same one, refreshed so the bar shows the account.
          onClose={() => {
            setOpen(false);
            if (inbox) refresh();
          }}
          returnTo={() => link.current}
        >
          {inbox ? (
            // The email page's form sends the new message, with the wait between mails it reads on the server.
            <p className="sign-in-dialog__inbox">
              <a className="btn btn--quiet" href={emailPagePath(next)}>
                Confirm Your Email
              </a>
            </p>
          ) : (
            <SignInPanel
              next={next}
              configured={configured}
              mode={openingMode}
              ledes={ledes}
              onHeaderChange={onHeaderChange}
              inDialog
              signUpLandsOnNext={signUpLandsOnNext}
              // From an invitation the invitation itself is the inbox view.
              onSignedUp={signUpLandsOnNext ? undefined : () => setInbox(true)}
            />
          )}
        </Modal>
      )}
    </>
  );
};

export default SignInDialog;
