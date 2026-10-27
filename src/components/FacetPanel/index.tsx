'use client';

import { type ReactElement, type ReactNode, useId } from 'react';
import type { CategoryMode, IngredientSource } from '@/modules/ingredients/schema/ingredient-enums';
import { useHydrated } from '../../lib/hydrated';
import CategoryPicker from '../CategoryPicker';
import FacetCombobox from '../FacetCombobox';
import { fieldDescription } from '../Field/description';
import { FieldShell } from '../Field/shell';
import FormIcon from '../FormIcon';
import type { CompendiumFacetCounts } from '../CompendiumList/types';
import { ChoiceChip } from './choice-chip';
import { FacetSwitch } from './facet-switch';
import { FacetShell } from './shell';
import type { FacetPanelProps } from './types';

// The ingredient lists' filters (M12.4) inside the Filters shell (./shell.tsx), which draws the
// button, Clear All and the panel itself. See claude-docs/components/facet-panel.md.

export { FacetShell, WIDE } from './shell';

const SOURCE_LABELS: Record<IngredientSource, string> = {
  local: 'Local',
  compendium: 'Compendium',
};

/**
 * The Source chip's choices: All, then Local and Compendium. The two always show, each with
 * its count once the coven's counts are read, as Toxic's do; All has none, as Toxic's Any has
 * none.
 */
function sourceOptions(
  counts: CompendiumFacetCounts['source'],
): { value: '' | IngredientSource; label: string; count?: number }[] {
  return [
    { value: '', label: 'All' },
    ...(['local', 'compendium'] as const).map((value) => ({
      value,
      label: SOURCE_LABELS[value],
      count: counts?.find((choice) => choice.value === value)?.count,
    })),
  ];
}

// In My Covens' two ways (M12.55): In, held in a picked coven, or Not In, held in none of them.
// Not In submits as covensNot=1; In submits an empty value, which the address reads as absent.
const COVENS_NOT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'In' },
  { value: '1', label: 'Not In' },
];

const MATCH_OPTIONS: ReadonlyArray<{ value: CategoryMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
];

/**
 * The categories before hydration: a native multiple select, as the other facets draw, whose
 * options sit under their group's name with their counts, so the GET form sends the choice
 * (CategoryPicker has no native control). A category with nothing behind it is disabled
 * unless it is chosen.
 */
function NativeCategories({
  categories,
  values,
}: {
  categories: FacetPanelProps['facets']['categories'];
  values: readonly string[];
}): ReactElement {
  const field = fieldDescription({ id: useId() });
  const groups = new Map<string, typeof categories>();
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
              .filter((category) => category.count > 0 || values.includes(category.value))
              .map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label} {category.count}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </FieldShell>
  );
}

/** The Reviewed strip's settings as the address writes them (M14.8). */
const REVIEW_ADDRESS = { reviewed: '1', needs_review: '0' } as const;

export default function FacetPanel({
  facets,
  filter,
  onChange,
  admin = false,
  loading = false,
  clearHref,
  onApply,
  onClear,
  className,
  covens = [],
}: FacetPanelProps): ReactElement {
  const hydrated = useHydrated();
  // Every chosen value counts, so two categories and two forms read 4. Match is a mode
  // of the categories, not a filter, and counts nothing.
  const chosen = [
    filter.covens ?? [],
    filter.categories,
    filter.forms,
    filter.deities,
    filter.zodiac,
    filter.celestialBodies,
    filter.elements,
  ].reduce((total, list) => total + list.length, 0);
  const count =
    chosen +
    // Not In with covens picked is a mode of them, as Match is; with none picked it is a filter
    // of its own, in none of the viewer's covens.
    (filter.covensNot && !filter.covens?.length ? 1 : 0) +
    (filter.toxic === '' ? 0 : 1) +
    (admin && filter.withoutReferences ? 1 : 0) +
    (admin && filter.withoutForms ? 1 : 0) +
    (admin && filter.reviewed ? 1 : 0) +
    (filter.source ? 1 : 0) +
    (filter.inStock ? 1 : 0) +
    (filter.lowStockOnly ? 1 : 0);

  const matchStuck = filter.categories.length < 2;
  const toxicStuck = facets.toxic.some((choice) => choice.count === 0);
  // The Source chip is stuck the same way: a source with nothing behind it means every
  // matching entry comes from the other, so the filter cannot narrow. Counts not yet read
  // (`facets.source` unset) leave it free.
  const sourceStuck = facets.source?.some((choice) => choice.count === 0) ?? false;
  // The Reviewed chip (M14.8), stuck the same way: with either side empty, every matching
  // entry is reviewed or none is.
  const reviewedStuck = facets.reviewed?.some((choice) => choice.count === 0) ?? false;
  // The public compendium's Forms line, whose chips are Toxic alone, is halved when the viewer has
  // covens (the owner's call, 2026-10-23): Forms and Toxic take the left half, In My Covens and its
  // In / Not In choice the right. With no covens Forms and Toxic take the line, as on the admin and
  // coven panels, which keep Forms growing beside their wider run of chips, which a half would wrap.
  const halves =
    !admin &&
    filter.source === undefined &&
    filter.inStock === undefined &&
    filter.lowStockOnly === undefined;
  // A call, not a component, so the fields inside keep their state across renders.
  const formsHalf = (children: ReactNode): ReactNode =>
    halves && covens.length > 0 ? (
      <div className="facet-panel__line facet-panel__grow facet-panel__half">{children}</div>
    ) : (
      children
    );
  return (
    <FacetShell
      count={count}
      clearHref={clearHref}
      onApply={onApply}
      onClear={onClear}
      className={className}
    >
      <div className="facet-panel__line">
        <div className="facet-panel__grow">
          {!hydrated ? (
            <NativeCategories categories={facets.categories} values={filter.categories} />
          ) : (
            <CategoryPicker
              legend="Categories"
              entry="Category"
              placeholder="Add Category"
              removeNoun="Category"
              hideZeros
              loading={loading}
              categories={facets.categories.map((category) => ({
                id: category.value,
                name: category.label,
                group: category.group,
                count: category.count,
              }))}
              value={filter.categories}
              onChange={(categories) => onChange({ categories })}
            />
          )}
          {hydrated &&
            filter.categories.map((slug) => (
              <input key={slug} type="hidden" name="categories" value={slug} />
            ))}
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
                : 'All: an ingredient must be in every chosen category. Any: in at least one of them.'
            }
            options={MATCH_OPTIONS}
            value={matchStuck ? 'all' : filter.categoryMode}
            disabled={matchStuck}
            onChange={(categoryMode) => onChange({ categoryMode })}
          />
        </div>
      </div>

      <div className="facet-panel__line">
        {formsHalf(
          <>
            <div className="facet-panel__grow">
              <FacetCombobox
                label="Forms"
                name="forms"
                typeahead
                placeholder="Add Form"
                removeNoun="Form"
                loading={loading}
                choices={facets.forms.map((form) => ({
                  value: form.value,
                  label: form.label,
                  count: form.count,
                  icon: <FormIcon name={form.icon} />,
                }))}
                values={filter.forms}
                onChange={(forms) => onChange({ forms })}
              />
            </div>
            <div className="facet-panel__quick">
              <ChoiceChip
                legend="Toxic"
                name="toxic"
                options={[
                  { value: '', label: 'Any' },
                  ...facets.toxic.map((choice) => ({
                    value: choice.value,
                    label: choice.label,
                    count: choice.count,
                  })),
                ]}
                // Toxic is the one facet that keeps a zero-count value: all three
                // choices always show. With either side empty, every matching entry
                // shares one toxicity, so the chip rests on Any and cannot narrow.
                value={toxicStuck ? '' : filter.toxic}
                disabled={toxicStuck}
                chipHint={
                  toxicStuck
                    ? 'Every matching entry shares the same toxicity, so this filter cannot narrow further.'
                    : undefined
                }
                onChange={(toxic) => onChange({ toxic })}
              />
              {filter.source !== undefined && (
                <ChoiceChip
                  legend="Source"
                  name="source"
                  hint={
                    sourceStuck
                      ? undefined
                      : 'Local: entries your coven added itself. Compendium: entries your coven holds a jar of from the compendium.'
                  }
                  chipHint={
                    sourceStuck
                      ? 'Every matching entry comes from the same source, so this filter cannot narrow further.'
                      : undefined
                  }
                  options={sourceOptions(facets.source)}
                  // Rests on All while stuck and submits nothing, as Toxic rests on Any.
                  value={sourceStuck ? '' : filter.source}
                  disabled={sourceStuck}
                  onChange={(source) => onChange({ source })}
                />
              )}
              {filter.inStock !== undefined && (
                <FacetSwitch
                  label="In Stock"
                  count={facets.inStock}
                  name="inStock"
                  checked={filter.inStock}
                  onChange={(inStock) => onChange({ inStock })}
                />
              )}
              {filter.lowStockOnly !== undefined && (
                <FacetSwitch
                  label="Low Stock Only"
                  count={facets.lowStockOnly}
                  name="lowStockOnly"
                  checked={filter.lowStockOnly}
                  onChange={(lowStockOnly) => onChange({ lowStockOnly })}
                />
              )}
              {admin && (
                <FacetSwitch
                  label="No Refs"
                  count={facets.withoutReferences}
                  name="withoutReferences"
                  checked={filter.withoutReferences}
                  onChange={(withoutReferences) => onChange({ withoutReferences })}
                />
              )}
              {admin && (
                <FacetSwitch
                  label="No Form"
                  count={facets.withoutForms}
                  name="withoutForms"
                  checked={filter.withoutForms}
                  onChange={(withoutForms) => onChange({ withoutForms })}
                />
              )}
              {admin && filter.reviewed !== undefined && facets.reviewed && (
                <ChoiceChip
                  legend="Reviewed"
                  name="reviewed"
                  // The address's own spelling, `1` and `0`, so the form submits what the
                  // parameter table reads before hydration.
                  options={[
                    { value: '', label: 'Any' },
                    ...facets.reviewed.map((choice) => ({
                      value: REVIEW_ADDRESS[choice.value],
                      label: choice.label,
                      count: choice.count,
                    })),
                  ]}
                  value={reviewedStuck || !filter.reviewed ? '' : REVIEW_ADDRESS[filter.reviewed]}
                  disabled={reviewedStuck}
                  chipHint={
                    reviewedStuck
                      ? 'Every matching entry has the same review mark, so this filter cannot narrow further.'
                      : undefined
                  }
                  onChange={(value) =>
                    onChange({
                      reviewed: value === '1' ? 'reviewed' : value === '0' ? 'needs_review' : '',
                    })
                  }
                />
              )}
            </div>
          </>,
        )}
        {/* The viewer's own covens (M12.55), the right half of the line with the In / Not In
                choice beside them (the owner's call, 2026-10-23), and only for a viewer in one. No
                counts: the counts the rest read are the cached, public ones, and a count per coven
                would make them the viewer's (rule 6). */}
        {covens.length > 0 && (
          <div className="facet-panel__line facet-panel__grow facet-panel__half">
            <div className="facet-panel__grow">
              <FacetCombobox
                label="In My Covens"
                name="covens"
                placeholder="Add Coven"
                removeNoun="Coven"
                loading={loading}
                counts={false}
                choices={covens.map(({ id: value, name: label }) => ({ value, label }))}
                values={filter.covens ?? []}
                // Removing the last coven switches the choice back to In (the owner's call,
                // 2026-10-23), so it never turns into "not held in any of my covens" unasked.
                onChange={(picked) =>
                  onChange(
                    picked.length === 0 ? { covens: picked, covensNot: false } : { covens: picked },
                  )
                }
              />
            </div>
            <div className="facet-panel__quick">
              <ChoiceChip
                legend="Covens"
                name="covensNot"
                options={COVENS_NOT_OPTIONS}
                value={filter.covensNot ? '1' : ''}
                onChange={(value) => onChange({ covensNot: value === '1' })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="facet-panel__line">
        <div className="facet-panel__grow">
          <FacetCombobox
            label="Celestial Bodies"
            name="celestialBodies"
            placeholder="Add Celestial Body"
            removeNoun="Celestial Body"
            loading={loading}
            choices={facets.celestialBodies}
            values={filter.celestialBodies}
            onChange={(celestialBodies) => onChange({ celestialBodies })}
          />
        </div>
        <div className="facet-panel__grow">
          <FacetCombobox
            label="Zodiac"
            name="zodiac"
            placeholder="Add Sign"
            emptyPlaceholder="No Signs"
            removeNoun="Sign"
            loading={loading}
            choices={facets.zodiac}
            values={filter.zodiac}
            onChange={(zodiac) => onChange({ zodiac })}
          />
        </div>
      </div>

      <div className="facet-panel__line">
        <div className="facet-panel__grow">
          <FacetCombobox
            label="Deities"
            name="deities"
            typeahead
            placeholder="Add Deity"
            removeNoun="Deity"
            loading={loading}
            choices={facets.deities.map((deity) => ({
              value: deity.value,
              label: deity.label,
              count: deity.count,
              group: deity.tradition,
            }))}
            values={filter.deities}
            onChange={(deities) => onChange({ deities })}
          />
        </div>
        <div className="facet-panel__grow">
          <FacetCombobox
            label="Elements"
            name="elements"
            placeholder="Add Element"
            removeNoun="Element"
            loading={loading}
            choices={facets.elements}
            values={filter.elements}
            onChange={(elements) => onChange({ elements })}
          />
        </div>
      </div>
    </FacetShell>
  );
}
