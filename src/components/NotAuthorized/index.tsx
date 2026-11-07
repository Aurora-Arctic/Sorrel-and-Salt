import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import './index.scss';
import { PendingLink } from '../../lib/navigation';

// The body of `src/app/(shell)/forbidden.tsx`: one sentence for every area and the way back, never who the keepers are or a way to
// ask them (claude-docs/components/error-page.md, "Not Authorized"). It sets its own `<title>`.

const NotAuthorized = (): ReactElement => (
  <div className="not-authorized">
    <title>Not Authorized</title>
    <PageHeader title="Not Authorized" lede="Your account cannot open this page." />
    <p className="not-authorized__way-back">
      <PendingLink className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </PendingLink>
    </p>
  </div>
);

export default NotAuthorized;
