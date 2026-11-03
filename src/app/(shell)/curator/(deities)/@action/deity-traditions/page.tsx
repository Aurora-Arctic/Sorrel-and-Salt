import { GroupAction } from '../../../group-page';
import type { GroupRouteProps } from '../../../types';

// Add Tradition, beside the page's heading while its tab is open.
export default function TraditionAction({ searchParams }: GroupRouteProps) {
  return GroupAction({ kind: 'tradition', searchParams });
}
