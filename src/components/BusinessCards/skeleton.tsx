import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';

/** The form with nothing in it yet: its lede, three fields and the Generate button as placeholders. */
export const BusinessCardsBodySkeleton = (): ReactElement => (
  <div className="form business-cards admin-index">
    <Skeleton shape="line" count={2} quiet />
    <Skeleton shape="block" count={3} quiet />
    <Skeleton shape="line" quiet />
  </div>
);
