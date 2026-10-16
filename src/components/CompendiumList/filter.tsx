'use client';

import { type ReactElement, useMemo } from 'react';
import { oneOf } from '@/lib/search-params';
import { NOMENCLATURE_KINDS } from '@/modules/ingredients/schema/ingredient-enums';
import { FilterSelectField, SwitchField } from '../Field';
import { useApplyFilter } from '../FilterForm';
import { IngredientSearchForm, useSearchText } from '../IngredientSearch';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import { editHeading } from './heading';
import { COMPENDIUM_PATH, compendiumHref } from './href';
import type { CompendiumListFilterProps, CompendiumPlace } from './types';

// The compendium's filter, on IngredientSearchForm (M8.10, MB.178, MB.115): a
// name search that is a type-ahead once hydrated, then a form, a
// classification and No Refs, each applying as it changes rather than on a
// Filter button pressed after them, the owner's call at MB.115's review.
// Classification applies on its pick and No Refs on its press, each carrying
// the name typed but not yet searched (read from the search form with
// `useSearchText`); the form once a choice settles, a pick, its clear or
// leaving the box, never while it is typed; the name on the magnifier or Enter.
// Picking a name in the dropdown opens that entry's modal over the list as it
// is shown, the typed text not applied (the owner's call, M8.10). Each field
// but the name is drawn from the filter shown and holds its own value after,
// since the list keys this by that filter and the new list draws it afresh.
// Once hydrated the form is typed into, as the curated lists' group is, and
// Classification is the select-only box, so the row has one dropdown look (the
// owner's calls, MB.115); the server draws each as a native `<select>`
// (`FilterSelectField`) and No Refs as a switch, a native checkbox valued
// `1`, so before hydration a press on the magnifier submits natively, as
// `query=&form=&nomenclature=` plus `withoutReferences=1` when on, which the
// page reads as the same filter.

/** The fields after the name box, inside the search form so they can read the name typed. */
const CompendiumFilterFields = ({ filter, forms }: CompendiumListFilterProps): ReactElement => {
  const text = useSearchText();
  const apply = useApplyFilter();
  // A form's name is its value too: the compendium filters a form by its text.
  const choices = useMemo(() => forms.map(({ name }) => ({ value: name, label: name })), [forms]);

  /** The filter shown with one field changed, the name typed carried, from the first page. */
  const hrefWith = (change: CompendiumPlace) =>
    compendiumHref({ ...filter, query: text.trim(), ...change });

  return (
    <>
      <FilterSelectField
        label="Form"
        name="form"
        all="All Forms"
        options={choices}
        defaultValue={filter.form}
        onChange={(form) => apply(hrefWith({ form }))}
        typeahead
      />
      <FilterSelectField
        label="Classification"
        name="nomenclature"
        all="Any"
        options={NOMENCLATURE_OPTIONS}
        defaultValue={filter.nomenclature}
        onChange={(kind) =>
          apply(hrefWith({ nomenclature: oneOf(NOMENCLATURE_KINDS, kind) ?? '' }))
        }
      />
      <SwitchField
        label="No Refs"
        name="withoutReferences"
        value="1"
        defaultChecked={filter.withoutReferences}
        onChange={(withoutReferences) => apply(hrefWith({ withoutReferences }))}
      />
    </>
  );
};

const CompendiumListFilter = ({ filter, forms }: CompendiumListFilterProps): ReactElement => (
  <IngredientSearchForm
    label="Filter the Compendium"
    action={COMPENDIUM_PATH}
    query={filter.query}
    shown={[filter.query, filter.form, filter.nomenclature, filter.withoutReferences]}
    searchHref={(query) => compendiumHref({ ...filter, query })}
    // The list as shown, the typed text not applied: the modal opens over it.
    pickHref={(match) => compendiumHref(filter, { edit: match.slug })}
    pickHeading={editHeading}
  >
    <CompendiumFilterFields filter={filter} forms={forms} />
  </IngredientSearchForm>
);

export default CompendiumListFilter;
