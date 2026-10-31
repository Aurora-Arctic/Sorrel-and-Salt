import Link from 'next/link';
import type { ReactElement } from 'react';
import { signInPath } from '../../lib/sign-in';
import { SUPPORT_PATH } from '../../lib/support-path';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import SupportForm from '../SupportForm';
import type { SupportPanelProps } from './types';

// The body of `/support`: the form for a sender who may write, otherwise the reason there is none
// (claude-docs/components/support-panel.md).

const SupportPanel = ({ state, path }: SupportPanelProps): ReactElement => {
  if (state.kind === 'signed-out') {
    return (
      <Notice kind="plain">
        Sign in to write to us. <Link href={signInPath(SUPPORT_PATH)}>Sign In</Link>
      </Notice>
    );
  }
  if (state.kind === 'timed-out') {
    return (
      <Notice kind="caution" quiet>
        You cannot send a request until <LocalTime at={state.until} long />.
      </Notice>
    );
  }
  return <SupportForm about={state.support} errorCode={state.errorCode} path={path} />;
};

export default SupportPanel;
