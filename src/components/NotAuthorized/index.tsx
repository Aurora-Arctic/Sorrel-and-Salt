import Link from 'next/link';
import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import './index.scss';

// The body of `src/app/(shell)/forbidden.tsx`: what a signed-in account sees at a page it cannot open.
// It says so in one sentence for every area, sets its own `<title>` (React hoists it), and offers the way back — never who the keepers are or
// a way to ask them (claude-docs/components/not-authorized.md).

const NotAuthorized = (): ReactElement => (
  <div className="not-authorized">
    <title>Not Authorized</title>
    <PageHeader title="Not Authorized" lede="Your account cannot open this page." />
    <p className="not-authorized__way-back">
      <Link className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </Link>
    </p>
  </div>
);

export default NotAuthorized;
