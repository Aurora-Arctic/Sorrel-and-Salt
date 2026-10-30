'use client';

import { type ReactElement, useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import Notice from '../Notice';

// Download CSV: reads the arrivals as one string through GraphQL, then hands it to the browser as a file.

const DownloadCsv = ({ read }: { read: () => Promise<string> }): ReactElement => {
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string>();

  async function download() {
    setBusy(true);
    setAlert(undefined);
    try {
      const csv = await read();
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'arrivals.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAlert(readGraphqlFailure(error).alert);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--solid"
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? 'Preparing' : 'Download CSV'}
      </button>
      {alert && <Notice kind="error">{alert}</Notice>}
    </>
  );
};

export default DownloadCsv;
