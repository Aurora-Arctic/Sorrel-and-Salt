import type { CardCategory, CategoryChipsProps } from './types';

export function chipTip(
  { category, forms }: CardCategory,
  tipOf: CategoryChipsProps['tipOf'],
): string | undefined {
  if (forms && forms.length > 0) return `On: ${forms.join(', ')}`;
  return tipOf?.(category);
}
