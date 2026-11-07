import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

export default function DeityAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'deity', searchParams });
}
