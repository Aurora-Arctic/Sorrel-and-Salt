'use client';

import { type ReactElement, useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { saveFile } from './save-file';

// Download CSV: reads the arrivals as one string through GraphQL, then hands it to the browser as a file. The button stays enabled while busy, so it keeps the focus; a second press does nothing. A failure
// is the button's click feedback, so it is read where the press was, not in the heading's action slot.

const DownloadCsv = ({ read }: { read: () => Promise<string> }): ReactElement => {
  const [busy, setBusy] = useState(false);
  const { anchorRef, report, feedback } = useClickFeedback({ name: 'Download CSV' });

  async function download() {
    if (busy) return;
    setBusy(true);
    report(undefined);
    try {
      const csv = await read();
      saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'card-sign-ups.csv');
    } catch (error) {
      report(readGraphqlFailure(error).alert);
    }
    setBusy(false);
  }

  return (
    <>
      <BusyButton
        ref={anchorRef}
        className="btn btn--solid"
        busy={busy}
        busyLabel="Preparing"
        onClick={() => void download()}
      >
        Download CSV
      </BusyButton>
      {feedback}
    </>
  );
};

export default DownloadCsv;
