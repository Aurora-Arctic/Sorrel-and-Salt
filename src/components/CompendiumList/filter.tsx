'use client';

import { type ReactElement, useId, useMemo, useState } from 'react';
import { useHydrated } from '@/lib/hydrated';
import { NOMENCLATURE_KINDS } from '@/modules/ingredients/schema/ingredient-enums';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import { FieldShell, SearchField, SwitchField, fieldDescription } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import { compendiumHref } from './href';
import type { CompendiumListFilterProps, CompendiumPlace } from './types';

// The compendium's filter, on the shared FilterForm (MB.178, MB.115): a name
// search, a form, a classification and No Refs, each applying as it changes
// rather than on a Filter button pressed after them, the owner's call at
// MB.115's review. Classification applies on its change and No Refs on its
// press, each carrying the name typed but not yet searched; the form once a
// choice settles, a pick, its clear or leaving the box, never while it is
// typed; the name on the magnifier or Enter. Each field but the name and the
// form's typing is uncontrolled, drawn from the filter shown, since the list
// keys this by that filter and the new list draws it afresh. The form is
// typed into once hydrated, as the curated lists' group is (the owner's call,
// MB.115), but the server draws it as a native `<select>`, Classification is
// a native `<select>` and No Refs a switch, a native checkbox valued `1`, so
// before hydration a press on the magnifier submits natively, as
// `query=&form=&nomenclature=` plus `withoutReferences=1` when on, which the
// page reads as the same filter; a hidden input carries the form after.

const CompendiumListFilter = ({ filter, forms }: CompendiumListFilterProps): ReactElement => {
  const formField = fieldDescription({ id: `${useId()}-form` });
  const kind = fieldDescription({ id: `${useId()}-nomenclature` });
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const [draftForm, setDraftForm] = useState(filter.form);
  const hydrated = useHydrated();
  const apply = useApplyFilter();
  // A form's name is its value too: the compendium filters a form by its text.
  const choices = useMemo(() => forms.map(({ name }) => ({ value: name, label: name })), [forms]);

  /** The filter shown with one field changed, the name typed carried, from the first page. */
  const hrefWith = (change: CompendiumPlace) =>
    compendiumHref({ ...filter, query: draftQuery.trim(), ...change });

  return (
    <FilterForm
      label="Filter the Compendium"
      action="/admin/compendium"
      searchHref={() => hrefWith({})}
      shown={[filter.query, filter.form, filter.nomenclature, filter.withoutReferences]}
    >
      <SearchField
        label="Name"
        name="query"
        placeholder="Search names"
        value={draftQuery}
        onChange={setDraftQuery}
      />
      <FieldShell label="Form" className="filter-row__typeahead" {...formField}>
        {hydrated ? (
          <>
            {/* Every form while blank, as the select's first choice says;
                the clear is the way back to it. */}
            <ComboboxTypeahead
              id={formField.controlId}
              label="Form"
              labelId={formField.labelId}
              value={draftForm}
              onChange={setDraftForm}
              onSettle={(form) => {
                if (form !== filter.form) apply(hrefWith({ form }));
              }}
              choices={choices}
              placeholder="All Forms"
              clearable
            />
            <input type="hidden" name="form" value={draftForm} />
          </>
        ) : (
          <select
            id={formField.controlId}
            className="select"
            name="form"
            defaultValue={filter.form}
          >
            <option value="">All Forms</option>
            {forms.map(({ name }) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </FieldShell>
      <FieldShell label="Classification" {...kind}>
        <select
          id={kind.controlId}
          className="select"
          name="nomenclature"
          defaultValue={filter.nomenclature}
          onChange={(event) =>
            apply(
              hrefWith({
                nomenclature: NOMENCLATURE_KINDS.find((each) => each === event.target.value) ?? '',
              }),
            )
          }
        >
          <option value="">Any</option>
          {NOMENCLATURE_OPTIONS.map((each) => (
            <option key={each.value} value={each.value}>
              {each.label}
            </option>
          ))}
        </select>
      </FieldShell>
      <SwitchField
        label="No Refs"
        name="withoutReferences"
        value="1"
        defaultChecked={filter.withoutReferences}
        onChange={(withoutReferences) => apply(hrefWith({ withoutReferences }))}
      />
    </FilterForm>
  );
};

export default CompendiumListFilter;
