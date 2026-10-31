'use client';

import { type ReactElement, useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { useClickFeedback } from '../ClickFeedback';
import { saveFile } from './save-file';

// Download CSV: reads the arrivals as one string through GraphQL, then hands it to the browser as a file. A failure
// is the button's click feedback, so it is read where the press was, not in the heading's action slot.

const DownloadCsv = ({ read }: { read: () => Promise<string> }): ReactElement => {
  const [busy, setBusy] = useState(false);
  const { anchorRef, report, feedback } = useClickFeedback({ name: 'Download CSV' });

  async function download() {
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
      <button
        ref={anchorRef}
        type="button"
        className="btn btn--solid"
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? 'Preparing' : 'Download CSV'}
      </button>
      {feedback}
    </>
  );
};

export default DownloadCsv;
