'use client';

import { type ReactElement, useId, useState } from 'react';
import DateField from '../DateField';
import { FieldShell, FilterSelectField, SearchField, fieldDescription } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { oneOf } from '../../lib/search-params';
import { BATCH_STATUSES, STATUS_LABEL } from './batches';
import { CARDS_PATH, cardsHref } from './href';
import type { CardsFilter, CardsFilterProps } from './types';

// The Cards tab's filter, on the shared FilterForm: the batch is held until the magnifier or Enter sends it; the
// status and each day apply as they change, from the first page. A day field has no name, so a hidden input carries
// it for the native submit before hydration; Clear empties the days.

const STATUS_OPTIONS = BATCH_STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }));

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
  const apply = useApplyFilter();
  /** The filter shown with `change` given, the batch typed carried, from the first page. */
  const hrefWith = (change: Partial<CardsFilter>) =>
    cardsHref({}, false, { ...filter, batch: draftBatch.trim(), ...change });

  return (
    <FilterForm
      label="Filter Invitation Cards"
      action={CARDS_PATH}
      searchHref={() => hrefWith({})}
      shown={[
        filter.batch,
        filter.status,
        filter.mintedFrom,
        filter.mintedTo,
        filter.expiresFrom,
        filter.expiresTo,
      ]}
    >
      <SearchField
        label="Batch"
        name="batch"
        placeholder="Search batches"
        value={draftBatch}
        onChange={setDraftBatch}
      />
      <FilterSelectField
        label="Status"
        name="status"
        all="All Statuses"
        options={STATUS_OPTIONS}
        defaultValue={filter.status}
        onChange={(chosen) => apply(hrefWith({ status: oneOf(BATCH_STATUSES, chosen) ?? '' }))}
      />
      <DayFilter
        label="Minted From"
        name="mintedFrom"
        value={filter.mintedFrom}
        max={filter.mintedTo}
        onChange={(day) => apply(hrefWith({ mintedFrom: day }))}
      />
      <DayFilter
        label="Minted To"
        name="mintedTo"
        value={filter.mintedTo}
        min={filter.mintedFrom}
        onChange={(day) => apply(hrefWith({ mintedTo: day }))}
      />
      <DayFilter
        label="Expires From"
        name="expiresFrom"
        value={filter.expiresFrom}
        max={filter.expiresTo}
        onChange={(day) => apply(hrefWith({ expiresFrom: day }))}
      />
      <DayFilter
        label="Expires To"
        name="expiresTo"
        value={filter.expiresTo}
        min={filter.expiresFrom}
        onChange={(day) => apply(hrefWith({ expiresTo: day }))}
      />
    </FilterForm>
  );
};

export default CardsFilterForm;
