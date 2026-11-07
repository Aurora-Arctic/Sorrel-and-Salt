import type { Route } from 'next';
import type { ReactNode } from 'react';

export type FilterValue = string | readonly string[] | boolean | null | undefined;

export interface FilterFormProps {
  label: string;
  action: Route;
  searchHref: () => Route;
  shown: readonly FilterValue[];
  clear?: boolean;
  /** Draw the layer a sticky row fills itself with, so the corner sorrel shows through it (IngredientSearch). Default false. */
  sorrel?: boolean;
  className?: string;
  children: ReactNode;
}
