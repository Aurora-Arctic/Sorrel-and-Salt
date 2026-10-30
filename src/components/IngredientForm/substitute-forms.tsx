'use client';

import type { ReactElement } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { SelectField } from '../Field';
import type { IngredientFormValues, SubstituteFormsProps, SubstituteListEntry } from './types';

// The second pickers of the ingredient's own substitutes: a substitute may name one form of the
// ingredient it links, so each linked ingredient that comes in forms gets a box choosing which,
// Any Form until one is chosen (claude-docs/components/ingredient-form.md, "The variants").

/** The choice that names no form: the ingredient, whichever form is to hand. */
const ANY_FORM = { value: '', label: 'Any Form' };

export function SubstituteForms({ name }: SubstituteFormsProps): ReactElement | null {
  const { control } = useFormContext<IngredientFormValues>();
  const entries: SubstituteListEntry[] = useWatch({ control, name });
  const choosing = entries.flatMap((entry, index) =>
    entry.link?.variants?.length ? [{ entry, link: entry.link, index }] : [],
  );
  if (choosing.length === 0) return null;
  return (
    <div className="ingredient-form__substitute-forms">
      {choosing.map(({ entry, link, index }) => (
        // Keyed by the ingredient, which a list holds once: its place moves
        // as entries before it are taken out.
        <SelectField<IngredientFormValues>
          key={link.id}
          name={`${name}.${index}.variantId`}
          label={`Form of ${entry.value}`}
          placeholder={ANY_FORM.label}
          options={[
            ANY_FORM,
            ...(link.variants ?? []).map(({ id, form }) => ({ value: id, label: form })),
          ]}
        />
      ))}
    </div>
  );
}
