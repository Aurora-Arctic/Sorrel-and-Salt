'use client';

import { type ReactElement, useId, useState } from 'react';
import DateField from '../DateField';
import { FieldShell, SearchField, fieldDescription } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { ChoiceChip } from '../FacetPanel/choice-chip';
import { FacetShell } from '../FacetPanel/shell';
import { BATCH_STATUSES, STATUS_LABEL } from './batches';
import { CARDS_PATH, cardsHref } from './href';
import type { CardsFilter, CardsFilterProps } from './types';

// The Cards tab's filter: the batch search in the row and the Filters (n) drawer holding the
// status and the four days, as the grimoire's filter holds its facets. What the drawer holds
// applies in one navigation when it shuts; a day field has no name, so a hidden input carries it
// for the native submit before hydration (claude-docs/components/admin-cards.md).

const STATUS_OPTIONS = [
  { value: '' as const, label: 'Any' },
  ...BATCH_STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] })),
];

/** What the drawer holds: every part of the filter but the batch. */
type Held = Omit<CardsFilter, 'batch'>;

const heldOf = ({ status, mintedFrom, mintedTo, expiresFrom, expiresTo }: CardsFilter): Held => ({
  status,
  mintedFrom,
  mintedTo,
  expiresFrom,
  expiresTo,
});

const NONE: Held = { status: '', mintedFrom: '', mintedTo: '', expiresFrom: '', expiresTo: '' };

/** How many filters the drawer holds: the status and each day given count one each. */
const countOf = (held: Held): number => Object.values(held).filter(Boolean).length;

type DayName = 'mintedFrom' | 'mintedTo' | 'expiresFrom' | 'expiresTo';

const DayFilter = ({
  label,
  name,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  name: DayName;
  value: string;
  min?: string;
  max?: string;
  onChange: (day: string) => void;
}): ReactElement => {
  const { aria, ...shell } = fieldDescription({ id: useId() });
  return (
    <FieldShell label={label} {...shell}>
      <DateField
        id={shell.controlId}
        labelledBy={shell.labelId}
        value={value}
        min={min || undefined}
        max={max || undefined}
        onChange={onChange}
        {...aria}
      />
      <input type="hidden" name={name} value={value} />
    </FieldShell>
  );
};

const CardsFilterForm = ({ filter }: CardsFilterProps): ReactElement => {
  const [draftBatch, setDraftBatch] = useState(filter.batch);
  // Started from the filter shown; the tab keys this form by it, so a new list starts it again.
  const [held, setHeld] = useState(() => heldOf(filter));
  const apply = useApplyFilter();
  const changed = JSON.stringify(held) !== JSON.stringify(heldOf(filter));
  const hold = (patch: Partial<Held>) => setHeld({ ...held, ...patch });

  return (
    <FilterForm
      label="Filter Invitation Cards"
      action={CARDS_PATH}
      className="admin-cards__filter"
      // The search and Apply Filters: the batch typed and everything the drawer holds.
      searchHref={() => cardsHref({}, false, { batch: draftBatch.trim(), ...held })}
      shown={[filter.batch]}
      // The drawer's Clear All stands in for Clear while it shows a filter, so one is drawn at a time.
      clear={countOf(heldOf(filter)) === 0}
    >
      <SearchField
        label="Batch"
        name="batch"
        placeholder="Search batches"
        value={draftBatch}
        onChange={setDraftBatch}
      />
      <FacetShell
        count={countOf(held)}
        clearHref={CARDS_PATH}
        // Shut any other way than Apply Filters: what the drawer holds, under the batch the page
        // shows, and nothing at all when none of it changed.
        onApply={() => {
          if (changed) apply(cardsHref({}, false, { batch: filter.batch, ...held }));
        }}
        onClear={() => {
          setHeld(NONE);
          apply(CARDS_PATH);
        }}
      >
        <div className="facet-panel__line">
          <div className="facet-panel__quick">
            <ChoiceChip
              legend="Status"
              name="status"
              options={STATUS_OPTIONS}
              value={held.status}
              onChange={(status) => hold({ status })}
            />
          </div>
        </div>
        <div className="facet-panel__line">
          <div className="facet-panel__grow">
            <DayFilter
              label="Minted From"
              name="mintedFrom"
              value={held.mintedFrom}
              max={held.mintedTo}
              onChange={(mintedFrom) => hold({ mintedFrom })}
            />
          </div>
          <div className="facet-panel__grow">
            <DayFilter
              label="Minted To"
              name="mintedTo"
              value={held.mintedTo}
              min={held.mintedFrom}
              onChange={(mintedTo) => hold({ mintedTo })}
            />
          </div>
        </div>
        <div className="facet-panel__line">
          <div className="facet-panel__grow">
            <DayFilter
              label="Expires From"
              name="expiresFrom"
              value={held.expiresFrom}
              max={held.expiresTo}
              onChange={(expiresFrom) => hold({ expiresFrom })}
            />
          </div>
          <div className="facet-panel__grow">
            <DayFilter
              label="Expires To"
              name="expiresTo"
              value={held.expiresTo}
              min={held.expiresFrom}
              onChange={(expiresTo) => hold({ expiresTo })}
            />
          </div>
        </div>
      </FacetShell>
    </FilterForm>
  );
};

export default CardsFilterForm;
