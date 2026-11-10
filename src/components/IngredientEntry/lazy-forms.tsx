'use client';

import type { ComponentProps, ReactElement } from 'react';
import { lazyModule, useLazyModule } from '../../lib/use-lazy-module';
import type CompendiumEntryFormType from '../CompendiumEntryForm';
import type CupboardEntryFormType from '../CupboardEntryForm';
import type IngredientFormType from '../IngredientForm';

// Each form dialog's form brings react-hook-form and the schemas in, so each loads apart from the pages' first-load
// scripts and starts early from the card control that opens it (claude-docs/components/ingredient-entry.md, "The forms").

/** One import of each form, shared by every dialog that opens it and started early by the cards' Edit and Annotate. */
export const ingredientFormModule = lazyModule(() => import('../IngredientForm'));
export const compendiumEntryFormModule = lazyModule(() => import('../CompendiumEntryForm'));
export const cupboardEntryFormModule = lazyModule(() => import('../CupboardEntryForm'));

export function LazyIngredientForm(
  props: ComponentProps<typeof IngredientFormType>,
): ReactElement | null {
  const module = useLazyModule(ingredientFormModule, true);
  return module ? <module.default {...props} /> : null;
}

export function LazyCompendiumEntryForm(
  props: ComponentProps<typeof CompendiumEntryFormType>,
): ReactElement | null {
  const module = useLazyModule(compendiumEntryFormModule, true);
  return module ? <module.default {...props} /> : null;
}

export function LazyCupboardEntryForm(
  props: ComponentProps<typeof CupboardEntryFormType>,
): ReactElement | null {
  const module = useLazyModule(cupboardEntryFormModule, true);
  return module ? <module.default {...props} /> : null;
}
