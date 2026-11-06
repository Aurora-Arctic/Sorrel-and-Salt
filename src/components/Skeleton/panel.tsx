import type { ReactElement } from 'react';
import Skeleton from '.';

// A panel section with nothing in it yet, as a page lays one: the section's heading and lede
// bars, then its fields as blocks.
export const PanelSkeleton = ({ fields = 1 }: { fields?: number }): ReactElement => (
  <section className="page-frame__section panel">
    <div className="header">
      <Skeleton shape="line" quiet />
      <Skeleton shape="line" quiet />
    </div>
    <Skeleton shape="block" count={fields} quiet />
  </section>
);
