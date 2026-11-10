import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

export default function CategoryAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'category', searchParams });
}
