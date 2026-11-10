import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

export default function FormAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'form', searchParams });
}
