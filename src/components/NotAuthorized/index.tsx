import type { ReactElement } from 'react';
import ErrorPage from '../ErrorPage';
import { WayOn } from '../ErrorPage/way-on';

// The body of `src/app/(shell)/forbidden.tsx`: the 404's layout and ways on, with one sentence for every area, never
// who the keepers are or a way to ask them (claude-docs/components/error-page.md, "Not Authorized"). `ErrorPage` draws
// the `main` and sets the `<title>`.

const NotAuthorized = (): ReactElement => (
  <ErrorPage title="Not Authorized" reason="Your account cannot open this page.">
    <WayOn code={403} />
  </ErrorPage>
);

export default NotAuthorized;
