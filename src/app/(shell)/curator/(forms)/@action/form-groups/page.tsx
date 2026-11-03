import { GroupAction } from '../../../group-page';
import type { GroupRouteProps } from '../../../types';

// Add Group, beside the page's heading while its tab is open.
export default function FormGroupAction({ searchParams }: GroupRouteProps) {
  return GroupAction({ kind: 'form', searchParams });
}
