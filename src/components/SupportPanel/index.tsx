import Link from 'next/link';
import type { ReactElement } from 'react';
import { signInPath } from '../../lib/sign-in';
import { SUPPORT_PATH } from '../../lib/support-path';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import SignedOutSupportForm from '../SignedOutSupportForm';
import SupportForm from '../SupportForm';
import type { SupportPanelProps } from './types';

// The body of the Support dialog: the form for a sender who may write, otherwise the reason there is none
// (claude-docs/components/support-panel.md).

const SupportPanel = ({
  state,
  path,
  returnTo = SUPPORT_PATH,
  onDone,
}: SupportPanelProps): ReactElement => {
  if (state.kind === 'signed-out') {
    return (
      <>
        <Notice kind="plain">
          Have an account? <Link href={signInPath(returnTo)}>Sign In</Link> to write about anything.
          Without one, you can write to us about accessibility or signing in.
        </Notice>
        <SignedOutSupportForm path={path} />
      </>
    );
  }
  if (state.kind === 'timed-out') {
    return (
      <Notice kind="caution" quiet>
        You cannot send a request until <LocalTime at={state.until} long />.
      </Notice>
    );
  }
  return (
    <SupportForm
      about={state.support}
      errorCode={state.errorCode}
      errorReference={state.errorReference}
      path={path}
      onDone={onDone}
    />
  );
};

export default SupportPanel;
