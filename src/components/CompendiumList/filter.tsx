'use client';

import { type ReactElement, useState } from 'react';
import { NOMENCLATURE_KINDS } from '@/modules/ingredients/schema/ingredient-enums';
import FilterForm from '../FilterForm';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import { compendiumHref } from './href';
import type { CompendiumListFilterProps } from './types';

// The filter, on the shared FilterForm (MB.178, MB.115): Filter is offered
// only when the form differs from the filter the page shows, and opens the
// new filter from the first page as a soft navigation, busy until the
// filtered list arrives. Classification is a native `<select>` and Without
// References a checkbox valued `1`, so before hydration the form still
// submits natively, as `query=&nomenclature=` plus `withoutReferences=1` when
// ticked, which the page reads as the same filter. The list keys this by the
// filter shown, so a page showing another — Back, say — starts it again from
// that one.

const CompendiumListFilter = ({ filter }: CompendiumListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const [draftKind, setDraftKind] = useState(filter.nomenclature);
  const [draftUnsourced, setDraftUnsourced] = useState(filter.withoutReferences);
  const changed =
    draftQuery.trim() !== filter.query ||
    draftKind !== filter.nomenclature ||
    draftUnsourced !== filter.withoutReferences;

  return (
    <FilterForm
      label="Filter the Compendium"
      action="/admin/compendium"
      href={() =>
        compendiumHref({
          query: draftQuery.trim(),
          nomenclature: draftKind,
          withoutReferences: draftUnsourced,
        })
      }
      disabled={!changed}
      navigation="soft"
    >
      <div className="field">
        <label className="field__label" htmlFor="compendium-list-query">
          Name
        </label>
        <input
          id="compendium-list-query"
          className="input"
          type="search"
          name="query"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="compendium-list-nomenclature">
          Classification
        </label>
        <select
          id="compendium-list-nomenclature"
          className="select"
          name="nomenclature"
          value={draftKind}
          onChange={(event) =>
            setDraftKind(NOMENCLATURE_KINDS.find((kind) => kind === event.target.value) ?? '')
          }
        >
          <option value="">Any</option>
          {NOMENCLATURE_OPTIONS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
      </div>
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
