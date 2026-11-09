import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import './index.scss';

// The panel while it loads: its own section, with no card and no inset, so its heading starts at the tab row's edge and the loaded
// panel replaces it without a shift. The heading is the real one; the counts and the summary field are not known yet.
export const DocumentMailingSkeleton = (): ReactElement => (
  <section className="document-mailing">
    <h2>Email Every Account</h2>
    <Skeleton shape="line" count={2} quiet />
    <Skeleton shape="block" quiet />
  </section>
);
