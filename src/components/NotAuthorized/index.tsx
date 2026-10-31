import Link from 'next/link';
import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import './index.scss';

// The body of `src/app/(shell)/forbidden.tsx`: what a signed-in non-admin sees at
// `/admin`. It says why and offers the way back — never who the admins are or
// a way to ask them (claude-docs/components/not-authorized.md).

const NotAuthorized = (): ReactElement => (
  <div className="not-authorized">
    <PageHeader
      title="Not Authorized"
      lede={
        <>
          This part of Sorrel &amp; Salt is where the site&rsquo;s admins curate the shared
          compendium. Your account does not have admin rights.
        </>
      }
    />
    <p className="not-authorized__way-back">
      <Link className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </Link>
    </p>
  </div>
);

export default NotAuthorized;
