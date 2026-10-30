'use client';

import { type ReactElement, useId } from 'react';
import type { CategoryMode } from '@/modules/ingredients/schema/ingredient-enums';
import { useHydrated } from '../../lib/hydrated';
import CategoryPicker from '../CategoryPicker';
import { fieldDescription } from '../Field/description';
import { FieldShell } from '../Field/shell';
import { ChoiceChip } from './choice-chip';
import type { CategoryLineChoice, CategoryLineProps } from './types';

// The Categories line, shared by the ingredient lists' panel (./index.tsx) and the grimoire's, so
// both pick categories and set Match the same way.

const MATCH_OPTIONS: ReadonlyArray<{ value: CategoryMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
];

/**
 * The categories before hydration: a native multiple select whose options sit under their group's
 * name with their counts, so the GET form sends the choice. A category with nothing behind it is
 * left out unless chosen; one with no count read is always offered.
 */
function NativeCategories({
  categories,
  values,
}: {
  categories: readonly CategoryLineChoice[];
  values: readonly string[];
}): ReactElement {
  const field = fieldDescription({ id: useId() });
  const groups = new Map<string, CategoryLineChoice[]>();
  for (const category of categories) {
    const name = category.group.name;
    groups.set(name, [...(groups.get(name) ?? []), category]);
  }
  return (
    <FieldShell label="Categories" className="facet-combobox" {...field}>
      <select
        id={field.controlId}
        className="select facet-combobox__native"
        name="categories"
        multiple
        defaultValue={[...values]}
        aria-describedby={field.aria['aria-describedby']}
      >
        {[...groups].map(([group, rows]) => (
          <optgroup key={group} label={group}>
            {rows
              .filter((category) => category.count !== 0 || values.includes(category.value))
              .map((category) => (
                <option key={category.value} value={category.value}>
                  {category.count === undefined
                    ? category.label
                    : `${category.label} ${category.count}`}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </FieldShell>
  );
}

export function CategoryLine({
  categories,
  values,
  mode,
  noun,
  loading = false,
  onChange,
}: CategoryLineProps): ReactElement {
  const hydrated = useHydrated();
  const matchStuck = values.length < 2;
  return (
    <div className="facet-panel__line">
      <div className="facet-panel__grow">
        {!hydrated ? (
          <NativeCategories categories={categories} values={values} />
        ) : (
          <CategoryPicker
            legend="Categories"
            entry="Category"
            placeholder="Add a category"
            removeNoun="Category"
            hideZeros
            loading={loading}
            categories={categories.map((category) => ({
              id: category.value,
              name: category.label,
              group: category.group,
              count: category.count,
            }))}
            value={values}
            onChange={(picked) => onChange({ categories: picked })}
          />
        )}
        {hydrated &&
          values.map((slug) => <input key={slug} type="hidden" name="categories" value={slug} />)}
      </div>
      {/* Match stays below two categories so the row does not shift as categories are
          picked: it rests on All, disabled, and says when it applies. The held mode is
          kept (it still reads All here, and the address drops it, M8.12). */}
      <div
        className={
          hydrated ? 'facet-panel__quick facet-panel__quick--picker' : 'facet-panel__quick'
        }
      >
        <ChoiceChip
          legend="Match"
          name="categoryMode"
          chipHint={
            matchStuck
              ? 'Match applies once two or more categories are chosen.'
              : `All: ${noun} must be in every chosen category. Any: in at least one of them.`
          }
          options={MATCH_OPTIONS}
          value={matchStuck ? 'all' : mode}
          disabled={matchStuck}
          onChange={(categoryMode) => onChange({ categoryMode })}
        />
      </div>
    </div>
  );
}
