import type { ReactElement } from 'react';
import { signInPath } from '../../lib/sign-in';
import { SUPPORT_PATH } from '../../lib/support-path';
import TimedOutSentence from '../SupportRequests/timed-out-sentence';
import Notice from '../Notice';
import SignedOutSupportForm from '../SignedOutSupportForm';
import SupportForm from '../SupportForm';
import type { SupportPanelProps } from './types';
import { PendingLink } from '../../lib/navigation';

// (claude-docs/components/support-form.md)

const SupportPanel = ({
  state,
  path,
  returnTo = SUPPORT_PATH,
  onDone,
}: SupportPanelProps): ReactElement => {
  if (state.kind === 'signed-out') {
    return (
      <div className="support-panel--signed-out">
        <Notice kind="plain">
          Have an account? <PendingLink href={signInPath(returnTo)}>Sign In</PendingLink> to write
          about anything. Without one, you can write to us about accessibility, a bug, signing in,
          privacy or a question.
        </Notice>
        <SignedOutSupportForm
          about={state.support}
          errorReference={state.errorReference}
          errorDetail={state.errorDetail}
          path={path}
        />
      </div>
    );
  }
  if (state.kind === 'timed-out') {
    return (
      <Notice kind="caution" quiet>
        <TimedOutSentence cannot="You cannot send a request" until={state.until} />
      </Notice>
    );
  }
  return (
    <SupportForm
      about={state.support}
      errorCode={state.errorCode}
      errorReference={state.errorReference}
      errorDetail={state.errorDetail}
      path={path}
      onDone={onDone}
    />
  );
};

export default SupportPanel;
