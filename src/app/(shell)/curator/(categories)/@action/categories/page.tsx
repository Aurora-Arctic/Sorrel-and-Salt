import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

// Add Category, beside the page's heading while its tab is open.
export default function CategoryAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'category', searchParams });
}
