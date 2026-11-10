'use client';

import { lazyComponent, lazyModule } from '../../lib/use-lazy-module';

// Each form dialog's form brings react-hook-form and the schemas in, so each loads apart from the pages' first-load
// scripts and starts early from the card control that opens it (claude-docs/components/ingredient-entry.md, "The forms").

/** One import of each form, shared by every dialog that opens it and started early by the cards' Edit and Annotate. */
export const ingredientFormModule = lazyModule(() => import('../IngredientForm'));
export const compendiumEntryFormModule = lazyModule(() => import('../CompendiumEntryForm'));
export const cupboardEntryFormModule = lazyModule(() => import('../CupboardEntryForm'));

export const LazyIngredientForm = lazyComponent(ingredientFormModule);
export const LazyCompendiumEntryForm = lazyComponent(compendiumEntryFormModule);
export const LazyCupboardEntryForm = lazyComponent(cupboardEntryFormModule);
