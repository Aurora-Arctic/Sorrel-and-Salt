'use client';

import { type MouseEvent, type ReactElement, useRef, useState } from 'react';
import { PendingLink } from '../../lib/navigation';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { safeReturnPath, signInPath } from '../../lib/sign-in';
import Modal from '../Modal';
import SignInPanel from '../SignInPanel';
import type { SignInMode } from '../SignInPanel/types';
import type { SignInDialogProps } from './types';

const TITLES: Record<SignInMode, string> = {
  'sign-in': 'Sign In',
  'sign-up': 'Create an Account',
};

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
  const link = useRef<HTMLAnchorElement>(null);

  const openDialog = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    setMode(openingMode);
    setOpen(true);
  };

  return (
    <>
      <PendingLink ref={link} className={className} href={signInPath(next)} onClick={openDialog}>
        {label}
      </PendingLink>
      {open && (
        <Modal
          title={TITLES[mode]}
          under={ledes?.[mode] && <p className="lede">{ledes[mode]}</p>}
          // Nothing typed here is kept, so nothing is asked before it closes.
          onClose={() => setOpen(false)}
          returnTo={() => link.current}
        >
          <SignInPanel
            next={next}
            configured={configured}
            mode={openingMode}
            onModeChange={setMode}
            inDialog
            signUpLandsOnNext={signUpLandsOnNext}
          />
        </Modal>
      )}
    </>
  );
};

export default SignInDialog;
