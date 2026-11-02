import type { CardCategory, CategoryChipsProps } from './types';

/** A chip's tip: the forms that carry a category the entry itself does not, else the caller's words, else none. */
export function chipTip(
  { category, forms }: CardCategory,
  tipOf: CategoryChipsProps['tipOf'],
): string | undefined {
  if (forms && forms.length > 0) return `On: ${forms.join(', ')}`;
  return tipOf?.(category);
}
