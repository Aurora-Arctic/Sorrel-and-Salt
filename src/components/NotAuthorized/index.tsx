import type { ReactElement } from 'react';
import ErrorPage from '../ErrorPage';
import { PendingLink } from '../../lib/navigation';

// The body of `src/app/(shell)/forbidden.tsx`: the 404's layout with one sentence for every area and the single way
// back, never who the keepers are or a way to ask them (claude-docs/components/error-page.md, "Not Authorized").
// `ErrorPage` draws the `main` and sets the `<title>`.

const NotAuthorized = (): ReactElement => (
  <ErrorPage title="Not Authorized" reason="Your account cannot open this page.">
    <PendingLink className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </PendingLink>
  </ErrorPage>
);

export default NotAuthorized;
