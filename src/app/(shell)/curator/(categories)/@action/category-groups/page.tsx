import { GroupAction } from '../../../group-page';
import type { GroupRouteProps } from '../../../types';

// Add Group, beside the page's heading while its tab is open.
export default function CategoryGroupAction({ searchParams }: GroupRouteProps) {
  return GroupAction({ kind: 'category', searchParams });
}
