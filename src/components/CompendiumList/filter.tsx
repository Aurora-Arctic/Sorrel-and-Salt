'use client';

import { type ReactElement, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { NOMENCLATURE_KINDS } from '@/modules/ingredients/schema/ingredient-enums';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import { FieldShell, fieldDescription } from '../Field';
import FilterForm from '../FilterForm';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import { compendiumHref } from './href';
import type { CompendiumListFilterProps } from './types';

// The filter, on the shared FilterForm (MB.178, MB.115): Filter is offered
// only when the form differs from the filter the page shows, and opens the
// new filter from the first page as a soft navigation, busy until the
// filtered list arrives. The form is typed into once hydrated, as the curated
// lists' group is (the owner's call, MB.115), but the server draws it as a
// native `<select>`; Classification is a native `<select>` and Without
// References a checkbox valued `1`. So before hydration the form still
// submits natively, as `query=&form=&nomenclature=` plus
// `withoutReferences=1` when ticked, which the page reads as the same
// filter, and a hidden input carries the form after. The list keys this by
// the filter shown, so a page showing another — Back, say — starts it again
// from that one.

// Nothing to subscribe to: the snapshot differs only between the server's
// render, and the hydration that follows it, and every render after.
const noSubscription = () => () => {};

const CompendiumListFilter = ({ filter, forms }: CompendiumListFilterProps): ReactElement => {
  const query = fieldDescription({ id: `${useId()}-query` });
  const formField = fieldDescription({ id: `${useId()}-form` });
  const kind = fieldDescription({ id: `${useId()}-nomenclature` });
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const [draftForm, setDraftForm] = useState(filter.form);
  const [draftKind, setDraftKind] = useState(filter.nomenclature);
  const [draftUnsourced, setDraftUnsourced] = useState(filter.withoutReferences);
  const changed =
    draftQuery.trim() !== filter.query ||
    draftForm !== filter.form ||
    draftKind !== filter.nomenclature ||
    draftUnsourced !== filter.withoutReferences;
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  // A form's name is its value too: the compendium filters a form by its text.
  const choices = useMemo(() => forms.map(({ name }) => ({ value: name, label: name })), [forms]);

  return (
    <FilterForm
      label="Filter the Compendium"
      action="/admin/compendium"
      href={() =>
        compendiumHref({
          query: draftQuery.trim(),
          form: draftForm,
          nomenclature: draftKind,
          withoutReferences: draftUnsourced,
        })
      }
      disabled={!changed}
      navigation="soft"
    >
      <FieldShell label="Name" {...query}>
        <input
          id={query.controlId}
          className="input"
          type="search"
          name="query"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
        />
      </FieldShell>
      <FieldShell label="Form" {...formField}>
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
            value={draftForm}
            onChange={(event) => setDraftForm(event.target.value)}
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
          value={draftKind}
          onChange={(event) =>
            setDraftKind(NOMENCLATURE_KINDS.find((each) => each === event.target.value) ?? '')
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
      <label className="checkbox">
        <input
          type="checkbox"
          name="withoutReferences"
          value="1"
          checked={draftUnsourced}
          onChange={(event) => setDraftUnsourced(event.target.checked)}
        />
        Without References
      </label>
    </FilterForm>
  );
};

export default CompendiumListFilter;
