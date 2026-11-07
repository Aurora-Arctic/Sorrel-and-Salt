import { GroupAction } from '../../../group-page';
import type { GroupRouteProps } from '../../../types';

export default function TraditionAction({ searchParams }: GroupRouteProps) {
  return GroupAction({ kind: 'tradition', searchParams });
}
