'use client';

import type { Route } from 'next';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { ADD_INGREDIENT_TITLE, openHref } from '@/components/AppShell/add-href';
import AddAction from '@/app/(shell)/curator/add-action';
import type { AddIngredientActionProps } from './types';

/**
 * Add Ingredient, the page header's action: opens this coven's dialog at once under
 * `?new=ingredient-coven-<slug>`, the address the bar's button writes, keeping the list's filter.
 * The shell owns the dialog, so a press only writes the address (`drawnHere`).
 */
export default function AddIngredientAction({ covenSlug }: AddIngredientActionProps): ReactElement {
  const href = openHref(usePathname(), new URLSearchParams(useSearchParams()), covenSlug) as Route;
  return (
    <AddAction href={href} drawnHere>
      {ADD_INGREDIENT_TITLE}
    </AddAction>
  );
}
