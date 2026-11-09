'use client';

import { type MouseEvent, type ReactElement, useRef, useState } from 'react';
import { emailPagePath } from '../../lib/account-email';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { safeReturnPath, signInPath } from '../../lib/sign-in';
import Modal from '../Modal';
import SignInPanel, { EMAIL_VIEW_TITLES, SIGN_IN_TITLES } from '../SignInPanel';
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
  const [mode, setMode] = useState(openingMode);
  // A new email account, signed in by its sign-up, told to check its inbox here rather than sent anywhere.
  const [inbox, setInbox] = useState(false);
  // The panel's email view, whose heading is this dialog's title; `focusTitle` puts the focus there as it opens.
  const [emailView, setEmailView] = useState(false);
  const { refresh } = usePendingNavigation();
  const link = useRef<HTMLAnchorElement>(null);

  const openDialog = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    setMode(openingMode);
    setInbox(false);
    setEmailView(false);
    setOpen(true);
  };

  return (
    <>
      <PendingLink ref={link} className={className} href={signInPath(next)} onClick={openDialog}>
        {label}
      </PendingLink>
      {open && (
        <Modal
          title={inbox ? INBOX_TITLE : (emailView ? EMAIL_VIEW_TITLES : SIGN_IN_TITLES)[mode]}
          focusTitle={emailView && !inbox}
          headerAlign="center"
          under={
            inbox ? (
              <p className="lede">{INBOX_LEDE}</p>
            ) : (
              ledes?.[mode] && <p className="lede">{ledes[mode]}</p>
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
              onModeChange={setMode}
              onEmailViewChange={setEmailView}
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
