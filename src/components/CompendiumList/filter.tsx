'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useState, useTransition } from 'react';
import { NOMENCLATURE_KINDS } from '@/modules/ingredients/schema/ingredient-enums';
import { NOMENCLATURE_OPTIONS } from '../IngredientForm/options';
import { compendiumHref } from './href';
import type { CompendiumListFilterProps } from './types';

// The filter, a GET form to the page itself (MB.178), as the category list's:
// Filter is offered only when the form differs from the filter the page shows,
// and opens the new filter from the first page as a soft navigation inside a
// transition, so Filter shows the spinner until the filtered list arrives.
// Classification is a native `<select>` and Without References a checkbox
// valued `1`, so before hydration the form still submits natively, as
// `query=&nomenclature=` plus `withoutReferences=1` when ticked, which the page
// reads as the same filter. The list keys this by the filter shown, so a page
// showing another — Back, say — starts it again from that one.

const CompendiumListFilter = ({ filter }: CompendiumListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const [draftKind, setDraftKind] = useState(filter.nomenclature);
  const [draftUnsourced, setDraftUnsourced] = useState(filter.withoutReferences);
  const [filtering, startFiltering] = useTransition();
  const router = useRouter();
  const changed =
    draftQuery.trim() !== filter.query ||
    draftKind !== filter.nomenclature ||
    draftUnsourced !== filter.withoutReferences;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || filtering) return;
    startFiltering(() => {
      router.push(
        compendiumHref({
          query: draftQuery.trim(),
          nomenclature: draftKind,
          withoutReferences: draftUnsourced,
        }),
      );
    });
  }

  return (
    <search>
      <form
        className="compendium-list__search"
        method="get"
        action="/admin/compendium"
        aria-label="Filter the compendium"
        onSubmit={submit}
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
        {/* `disabled`, not `aria-disabled`: a submit with nothing to send. */}
        <button
          className="btn btn--solid"
          type="submit"
          disabled={!changed || filtering}
          aria-busy={filtering || undefined}
        >
          {filtering && <span className="spinner" aria-hidden="true" />}
          {filtering ? 'Filtering' : 'Filter'}
        </button>
      </form>
    </search>
  );
};

export default CompendiumListFilter;
