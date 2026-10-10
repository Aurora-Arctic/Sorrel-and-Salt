import Link from 'next/link';
import type { ReactElement } from 'react';
import './index.scss';

// The body of `src/app/forbidden.tsx`: what a signed-in non-admin sees at
// `/admin`. It says why and offers the way back — never who the admins are or
// a way to ask them (claude-docs/components/not-authorized.md).

const NotAuthorized = (): ReactElement => (
  <div className="not-authorized">
    <h1 className="not-authorized__title">Not Authorized</h1>
    <p className="not-authorized__reason">
      This part of Sorrel &amp; Salt is where the site&rsquo;s admins curate the shared compendium,
      and your account does not have admin rights.
    </p>
    <p className="not-authorized__way-back">
      <Link href="/">Back to Sorrel &amp; Salt</Link>
    </p>
  </div>
);

export default NotAuthorized;
