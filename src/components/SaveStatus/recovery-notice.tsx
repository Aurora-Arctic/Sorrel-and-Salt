import type { ReactElement } from 'react';
import { clockTime } from '../LastEdit/relative';
import Notice from '../Notice';
import type { RecoveryNoticeProps } from './types';

// What an autosaving form says when it opens on typing this browser kept from before: when it
// was, and whether to keep it. Styled as the conflict notice, so the two line up under a dialog's title.

const RecoveryNotice = ({ at, onKeep, onDiscard }: RecoveryNoticeProps): ReactElement => (
  <Notice kind="warn" block className="save-status__recovery">
    <span>Restored unsaved changes from {clockTime(at)}.</span>
    <span className="save-status__actions">
      {/* One primary: Keep, the choice that loses no typing; Discard sits back, quiet. */}
      <button type="button" className="btn btn--solid btn--small" onClick={onKeep}>
        Keep
      </button>
      <button type="button" className="btn btn--quiet btn--small" onClick={onDiscard}>
        Discard
      </button>
    </span>
  </Notice>
);

export default RecoveryNotice;
