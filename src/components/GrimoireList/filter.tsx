'use client';

import type { Route } from 'next';
import CardDensitySwitch from '../CardDensitySwitch';
import { type ReactElement, useMemo, useState } from 'react';
import type { CategoryMode } from '@/modules/ingredients/schema/ingredient-enums';
import { CategoryLine } from '../FacetPanel/category-line';
import { FacetShell } from '../FacetPanel/shell';
import { useApplyFilter } from '../FilterForm';
import { IngredientSearchForm } from '../IngredientSearch';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import { useListNavigation } from '../ListFrame';
import SearchSentence from '../SearchSentence';
import { GRIMOIRE_PARAMS } from './params';
import { recipeHref } from './recipe-href';
import { nounOf } from './noun';
import type { GrimoireFilterProps, GrimoireListFilter } from './types';

// The grimoire's filter row (M10.11), the compendium's (CompendiumList/filter.tsx) on the
// grimoire's parameter set: the title search, then the Filters (n) button with its Clear All
// and the panel it opens, which holds the Categories line alone. Status is not a filter here:
// Spells and Drafts are two tabs, so each tab's row searches and filters within its own status.
// A change in the panel is held until it shuts, then applied in one soft navigation, as the
// compendium's is. Picking a title in the search box's dropdown opens that spell's recipe page (MB.6). See claude-docs/components/grimoire-list.md.

/** What the panel holds: the categories and their match mode. */
interface Held {
  categories: readonly string[];
  categoryMode: CategoryMode;
}

const heldOf = ({ categories, categoryMode }: GrimoireListFilter): Held => ({
  categories,
  categoryMode,
});

const NONE: Held = { categories: [], categoryMode: 'all' };

/** The tab's address under the filter shown, the panel's categories and the text typed set over it. */
const hrefFor = (path: Route, filter: GrimoireListFilter, held: Held, query: string): Route =>
  GRIMOIRE_PARAMS.href(
    path,
    GRIMOIRE_PARAMS.changed(
      { ...filter, query },
      {
        categories: [...held.categories],
        // Below two categories the mode means nothing, so the address leaves it out.
        categoryMode: held.categories.length >= 2 ? held.categoryMode : 'all',
      },
    ),
  ) as Route;

const PanelCategories = ({
  path,
  filter,
  categories,
  held,
  onHeld,
}: Pick<GrimoireFilterProps, 'path' | 'filter' | 'categories'> & {
  held: Held;
  onHeld: (next: Held) => void;
}): ReactElement => {
  const apply = useApplyFilter();
  const { pending } = useListNavigation();
  const changed = JSON.stringify(held) !== JSON.stringify(heldOf(filter));
  const choices = useMemo(
    () =>
      categories.map(({ slug, name, group, count }) => ({
        value: slug,
        label: name,
        group,
        count,
      })),
    [categories],
  );
  return (
    <FacetShell
      count={held.categories.length}
      clearHref={path}
      className="compendium-list__panel"
      // Shut any other way than Apply Filters, whose submit applies the text as well: the
      // categories held, under the text the page shows, and nothing at all when none changed.
      onApply={() => {
        if (changed) apply(hrefFor(path, filter, held, filter.query));
      }}
      onClear={() => {
        onHeld(NONE);
        apply(path);
      }}
    >
      <CategoryLine
        categories={choices}
        values={held.categories}
        mode={held.categoryMode}
        noun="a spell"
        loading={pending}
        onChange={(patch) => onHeld({ ...held, ...patch })}
      />
    </FacetShell>
  );
};

const GrimoireFilterRow = ({
  path,
  workspaceId,
  covenSlug,
  status,
  filter,
  categories,
}: Omit<GrimoireFilterProps, 'total'>): ReactElement => {
  // The panel as held: the filter shown until something in it is changed, and the filter
  // shown again whenever a new list arrives (Back, Apply, Clear All).
  const shown = heldOf(filter);
  const [held, setHeld] = useState(shown);
  const [seen, setSeen] = useState(JSON.stringify(shown));
  if (seen !== JSON.stringify(shown)) {
    setSeen(JSON.stringify(shown));
    setHeld(shown);
  }
  return (
    <IngredientSearchForm
      label="Filter the Grimoire"
      action={path}
      query={filter.query}
      shown={[]}
      clear={false}
      className="compendium-list__row"
      searchHref={(query) => hrefFor(path, filter, held, query)}
      // A picked title opens that spell's recipe page (MB.6).
      pickHref={({ id }) => recipeHref(covenSlug, id)}
      source={{ kind: 'grimoire', workspaceId, status }}
    >
      <PanelCategories
        path={path}
        filter={filter}
        categories={categories}
        held={held}
        onHeld={setHeld}
      />
      {/* A view setting, not a filter: it sits in the row, inside the search landmark, and
          submits nothing. One stored choice serves this list and the Ingredients list. */}
      <CardDensitySwitch />
    </IngredientSearchForm>
  );
};

/** The filter an address holds, read from the same parameter table the page reads. */
function filterOf(href: string): GrimoireListFilter {
  const params: Record<string, string[]> = {};
  const { searchParams } = new URL(href, 'http://localhost');
  for (const key of new Set(searchParams.keys())) params[key] = searchParams.getAll(key);
  return GRIMOIRE_PARAMS.read(params);
}

const GrimoireFilter = ({
  path,
  workspaceId,
  covenSlug,
  status,
  filter,
  categories,
  total,
}: GrimoireFilterProps): ReactElement => {
  // Only a filter's navigation retypes the sentence, and while it is on its way the sentence
  // names the address being opened rather than the one shown.
  const { searching, target } = useListNavigation();
  const searched = searching && target !== undefined ? filterOf(target) : filter;
  const sentence = useMemo(
    () =>
      buildSearchSentence({
        filter: searched,
        labels: {
          categories: Object.fromEntries(categories.map(({ slug, name }) => [slug, name])),
        },
        total,
        noun: nounOf(status),
      }),
    [searched, categories, total, status],
  );
  return (
    <>
      {/* Keyed by the text searched, so another one starts the box again from it. */}
      <GrimoireFilterRow
        key={filter.query}
        path={path}
        workspaceId={workspaceId}
        covenSlug={covenSlug}
        status={status}
        filter={filter}
        categories={categories}
      />
      <SearchSentence sentence={sentence} query={searched.query} pending={searching} />
    </>
  );
};

export default GrimoireFilter;
