'use client';

import type { ReactElement } from 'react';
import { ADD_INGREDIENT_TITLE, covenIngredientValue } from '@/components/AppShell/add-href';
import DialogAddAction from '@/app/(shell)/_admin/dialog-add-action';
import type { AddIngredientActionProps } from './types';

/**
 * Add Ingredient, the page header's action: opens this coven's dialog at once under
 * `?new=ingredient-coven-<slug>`, the address the bar's button writes, keeping the list's filter.
 * The shell owns the dialog, so a press only writes the address.
 */
export default function AddIngredientAction({ covenSlug }: AddIngredientActionProps): ReactElement {
  return (
    <DialogAddAction value={() => covenIngredientValue(covenSlug)} label={ADD_INGREDIENT_TITLE} />
  );
}
