'use client';

import { type ReactElement, useId, useState } from 'react';
import { ComboboxSelect } from '../Combobox/select';
import { isoDay } from '../DateField/day';
import DateRangeField from '../DateRangeField';
import type { DayRange, QuickPick } from '../DateRangeField/types';
import { FieldShell, SearchField, fieldDescription } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { FacetShell } from '../FacetPanel/shell';
import { CARDS_PATH, cardsHref } from './href';
import type { CardsFilter, CardsFilterProps } from './types';

// The Cards tab's filter: the batch search in the row and the Filters (n) drawer holding the
// status and the minted and expiry ranges on one line, as the grimoire's filter holds its facets. What the drawer holds
// applies in one navigation when it shuts; a range field has no name, so two hidden inputs carry it
// for the native submit before hydration (claude-docs/components/admin-cards.md).

// Title case, as an option is a label; the table's cells keep `STATUS_LABEL`'s sentence case.
const STATUS_OPTIONS: { value: CardsFilter['status']; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'live', label: 'Live' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
  { value: 'used-up', label: 'Used Up' },
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

/** How many filters the drawer holds: the status and each range with a day in it, one apiece. */
const countOf = ({ status, mintedFrom, mintedTo, expiresFrom, expiresTo }: Held): number =>
  [status, mintedFrom || mintedTo, expiresFrom || expiresTo].filter(Boolean).length;

/** Today and the ranges a person most often wants, worked out when pressed: ago or ahead. */
const day = (shift: number): string => {
  const at = new Date();
  at.setDate(at.getDate() + shift);
  return isoDay(at);
};
const monthOf = (shift: number): DayRange => {
  const at = new Date();
  return {
    from: isoDay(new Date(at.getFullYear(), at.getMonth() + shift, 1)),
    to: isoDay(new Date(at.getFullYear(), at.getMonth() + shift + 1, 0)),
  };
};
const MINTED_PICKS: QuickPick[] = [
  { label: 'Today', range: () => ({ from: day(0), to: day(0) }) },
  { label: 'Last 7 Days', range: () => ({ from: day(-6), to: day(0) }) },
  { label: 'Last 30 Days', range: () => ({ from: day(-29), to: day(0) }) },
  { label: 'This Month', range: () => monthOf(0) },
  { label: 'Last Month', range: () => monthOf(-1) },
];
const EXPIRES_PICKS: QuickPick[] = [
  { label: 'Today', range: () => ({ from: day(0), to: day(0) }) },
  { label: 'Next 7 Days', range: () => ({ from: day(0), to: day(6) }) },
  { label: 'Next 30 Days', range: () => ({ from: day(0), to: day(29) }) },
  { label: 'This Month', range: () => monthOf(0) },
  { label: 'Next Month', range: () => monthOf(1) },
];

const RangeFilter = ({
  label,
  names,
  range,
  picks,
  past = false,
  onChange,
}: {
  label: string;
  names: [from: string, to: string];
  range: DayRange;
  picks: QuickPick[];
  past?: boolean;
  onChange: (range: DayRange) => void;
}): ReactElement => {
  const { aria, ...shell } = fieldDescription({ id: useId() });
  return (
    <FieldShell label={label} {...shell}>
      <DateRangeField
        id={shell.controlId}
        labelledBy={shell.labelId}
        label={label}
        from={range.from}
        to={range.to}
        quickPicks={picks}
        past={past}
        onChange={onChange}
        {...aria}
      />
      <input type="hidden" name={names[0]} value={range.from} />
      <input type="hidden" name={names[1]} value={range.to} />
    </FieldShell>
  );
};

const StatusFilter = ({
  value,
  onChange,
}: {
  value: Held['status'];
  onChange: (status: Held['status']) => void;
}): ReactElement => {
  const field = fieldDescription({ id: useId() });
  return (
    <FieldShell label="Status" {...field}>
      <ComboboxSelect
        id={field.controlId}
        label="Status"
        labelId={field.labelId}
        value={value}
        onChange={(picked) => onChange(picked as Held['status'])}
        choices={STATUS_OPTIONS}
      />
      <input type="hidden" name="status" value={value} />
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
          <div className="admin-cards__status">
            <StatusFilter value={held.status} onChange={(status) => hold({ status })} />
          </div>
          <div className="facet-panel__grow">
            <RangeFilter
              label="Minted"
              names={['mintedFrom', 'mintedTo']}
              range={{ from: held.mintedFrom, to: held.mintedTo }}
              picks={MINTED_PICKS}
              past
              onChange={({ from, to }) => hold({ mintedFrom: from, mintedTo: to })}
            />
          </div>
          <div className="facet-panel__grow">
            <RangeFilter
              label="Expires"
              names={['expiresFrom', 'expiresTo']}
              range={{ from: held.expiresFrom, to: held.expiresTo }}
              picks={EXPIRES_PICKS}
              onChange={({ from, to }) => hold({ expiresFrom: from, expiresTo: to })}
            />
          </div>
        </div>
      </FacetShell>
    </FilterForm>
  );
};

export default CardsFilterForm;
