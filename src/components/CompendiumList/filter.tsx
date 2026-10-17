'use client';

import { type ReactElement, useMemo, useState } from 'react';
import type { CategoryMode } from '@/modules/ingredients/schema/ingredient-enums';
import CategoryPicker from '../CategoryPicker';
import { FilterSelectField, RadioGroupField, SwitchField } from '../Field';
import { useApplyFilter } from '../FilterForm';
import { IngredientSearchForm, useSearchText } from '../IngredientSearch';
import { editHeading } from './heading';
import { COMPENDIUM_PATH, compendiumHref } from './href';
import { COMPENDIUM_PARAMS } from './params';
import type { CompendiumListFilter, CompendiumListFilterProps } from './types';

/** How two or more categories combine: the radios' labels, in title case. */
const CATEGORY_MODE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
] as const;

// The compendium's filter, on IngredientSearchForm (M8.10, MB.178, MB.115): a
// name search that is a type-ahead once hydrated, then a form and No Refs,
// each applying as it changes rather than on a Filter button pressed after
// them, the owner's call at MB.115's review. No Refs applies on its press,
// carrying the name typed but not yet searched (read from the search form
// with `useSearchText`); the form once a choice settles, a pick, its clear or
// leaving the box, never while it is typed; the name on the magnifier, Enter or its clear.
// Picking a name in the dropdown opens that entry's modal over the list as it
// is shown, the typed text not applied (the owner's call, M8.10). Each field
// but the name is drawn from the filter shown and holds its own value after,
// since the list keys this by that filter and the new list draws it afresh.
// Once hydrated the form is typed into, as the curated lists' group is (the
// owner's call, MB.115); the server draws it as a native `<select>`
// (`FilterSelectField`) and No Refs as a switch, a native checkbox valued
// `1`, so before hydration a press on the magnifier submits natively, as
// `query=&forms=` plus `withoutReferences=1` when on, which the page reads
// as the same filter. The box picks one form for now; the address holds any
// number (`?forms=Oil&forms=Resin`), and the ones past the first ride along
// as hidden inputs until the facet chips replace this box (M12.4).

/** The fields after the name box, inside the search form so they can read the name typed. */
const CompendiumFilterFields = ({
  filter,
  facets,
  categories,
}: CompendiumListFilterProps): ReactElement => {
  const text = useSearchText();
  const apply = useApplyFilter();
  // A form's name is its value too: the compendium filters a form by its text.
  const choices = useMemo(
    () => facets.forms.map(({ value, label }) => ({ value, label })),
    [facets.forms],
  );

  // The categories the filter names that the page knows, in the address's
  // order. A slug no live category holds is not shown, and so is not carried
  // into the next address, which is how a stale one leaves it.
  const shown = useMemo(() => {
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    return filter.categories.flatMap((slug) => bySlug.get(slug) ?? []);
  }, [categories, filter.categories]);

  // The picks as the box shows them: a pick shows at once, where the page's
  // filter follows only when the new list arrives, and follows it again then
  // (a Clear, Back). The list does not draw this form afresh for a change in
  // categories alone (see the key in ./index.tsx), so the picker keeps its
  // status region and the focus across a pick.
  const shownIds = shown.map(({ id }) => id);
  const [chosen, setChosen] = useState(shownIds);
  const [seen, setSeen] = useState(shownIds.join());
  if (seen !== shownIds.join()) {
    setSeen(shownIds.join());
    setChosen(shownIds);
  }

  // The mode as the radios show it, held and followed as the picks are, for
  // the same reason: choosing one must not draw the form afresh and lose the focus.
  const [mode, setMode] = useState<CategoryMode>(filter.categoryMode);
  const [seenMode, setSeenMode] = useState(filter.categoryMode);
  if (seenMode !== filter.categoryMode) {
    setSeenMode(filter.categoryMode);
    setMode(filter.categoryMode);
  }

  /**
   * The filter shown with one field changed, the name typed carried, from the
   * first page. The categories and mode are the box's own, ahead of the page's
   * when a change is still on its way.
   */
  const hrefWith = (change: Partial<CompendiumListFilter>) => {
    const slugOf = new Map(categories.map(({ id, slug }) => [id, slug]));
    return compendiumHref(
      COMPENDIUM_PARAMS.changed(
        {
          ...filter,
          query: text.trim(),
          categories: chosen.flatMap((id) => slugOf.get(id) ?? []),
          categoryMode: mode,
        },
        change,
      ),
    );
  };

  return (
    <>
      <FilterSelectField
        label="Form"
        name="forms"
        all="All Forms"
        options={choices}
        defaultValue={filter.forms[0] ?? ''}
        onChange={(form) => apply(hrefWith({ forms: form ? [form] : [] }))}
        typeahead
      />
      {filter.forms.slice(1).map((form) => (
        <input key={form} type="hidden" name="forms" value={form} />
      ))}
      <SwitchField
        label="No Refs"
        name="withoutReferences"
        value="1"
        defaultChecked={filter.withoutReferences}
        onChange={(withoutReferences) => apply(hrefWith({ withoutReferences }))}
      />
      <CategoryPicker
        legend="Categories"
        entry="Category"
        placeholder="Add Category"
        categories={categories}
        value={chosen}
        onChange={(ids) => {
          const slugOf = new Map(categories.map(({ id, slug }) => [id, slug]));
          const categorySlugs = ids.flatMap((id) => slugOf.get(id) ?? []);
          setChosen(ids);
          // Below two the mode means nothing, so it goes with them: the address
          // holds only what is filtering, and a second pick starts at All.
          const kept = categorySlugs.length >= 2 ? mode : 'all';
          setMode(kept);
          apply(hrefWith({ categories: categorySlugs, categoryMode: kept }));
        }}
      />
      {chosen.length >= 2 && (
        <RadioGroupField
          legend="Match"
          name="categoryMode"
          options={CATEGORY_MODE_OPTIONS}
          value={mode}
          onChange={(next) => {
            setMode(next);
            apply(hrefWith({ categoryMode: next }));
          }}
        />
      )}
      {/* The picker has no native input, so a submit before hydration sends these. */}
      {shown.map(({ id, slug }) => (
        <input key={id} type="hidden" name="categories" value={slug} />
      ))}
    </>
  );
};

const CompendiumListFilter = ({
  filter,
  facets,
  categories,
}: CompendiumListFilterProps): ReactElement => {
  // The mode filters nothing without categories, so it does not make the list "filtered".
  const { categoryMode: _mode, ...shownFilter } = filter;
  return (
    <IngredientSearchForm
      label="Filter the Compendium"
      action={COMPENDIUM_PATH}
      query={filter.query}
      shown={Object.values(shownFilter)}
      searchHref={(query) => compendiumHref({ ...filter, query })}
      // The list as shown, the typed text not applied: the modal opens over it.
      pickHref={(match) => compendiumHref(filter, { edit: match.slug })}
      pickHeading={editHeading}
    >
      <CompendiumFilterFields filter={filter} facets={facets} categories={categories} />
    </IngredientSearchForm>
  );
};

export default CompendiumListFilter;
