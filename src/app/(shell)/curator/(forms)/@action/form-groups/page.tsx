import { GroupAction } from '../../../group-page';
import type { GroupRouteProps } from '../../../types';

export default function FormGroupAction({ searchParams }: GroupRouteProps) {
  return GroupAction({ kind: 'form', searchParams });
}
