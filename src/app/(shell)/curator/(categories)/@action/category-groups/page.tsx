import { GroupAction } from '../../../group-page';
import type { GroupRouteProps } from '../../../types';

export default function CategoryGroupAction({ searchParams }: GroupRouteProps) {
  return GroupAction({ kind: 'category', searchParams });
}
