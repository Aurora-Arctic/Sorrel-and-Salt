import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

// Add Form, beside the page's heading while its tab is open (MB.115).
export default function FormAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'form', searchParams });
}
