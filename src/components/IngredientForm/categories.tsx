'use client';

import type { ReactElement } from 'react';
import { CategoriesField } from '../CategoryPicker/field';
import type { SharedFieldProps } from './types';

export function CategoryField({ at, action }: SharedFieldProps): ReactElement {
  return (
    <CategoriesField
      name={at ? `${at}.categoryIds` : 'categoryIds'}
      boxName={at ? `${at}.drafts.categoryIds` : 'drafts.categoryIds'}
      action={action}
    />
  );
}
