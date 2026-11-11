'use client';

import type { ReactElement } from 'react';
import BusyButton from '../BusyButton';
import { useGuardedAction } from '../ClickFeedback/use-guarded-action';
import { saveFile } from '../../lib/save-file';

// Download CSV: reads the arrivals as one string through GraphQL, then hands it to the browser as a file. The button stays enabled while busy, so it keeps the focus; a second press does nothing. A failure
// is the button's click feedback, so it is read where the press was, not in the heading's action slot.

const DownloadCsv = ({ read }: { read: () => Promise<string> }): ReactElement => {
  const {
    anchorRef,
    run,
    pending: busy,
    feedback,
  } = useGuardedAction({
    name: 'Download CSV',
    resetWhenDone: true,
    action: async () => {
      const csv = await read();
      saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'card-sign-ups.csv');
    },
  });

  return (
    <>
      <BusyButton
        ref={anchorRef}
        className="btn btn--solid"
        busy={busy}
        busyLabel="Preparing"
        onClick={() => void run()}
      >
        Download CSV
      </BusyButton>
      {feedback}
    </>
  );
};

export default DownloadCsv;
