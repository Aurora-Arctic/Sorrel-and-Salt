'use client';

import { type ReactElement, useMemo, useState } from 'react';
import { INGREDIENT_ELEMENTS } from '@/modules/ingredients/schema/ingredient-enums';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { SearchSentenceLabels } from '../IngredientSearch/types';
import FacetPanel from '../FacetPanel';
import type { FacetPanelFilter } from '../FacetPanel/types';
import { useApplyFilter } from '../FilterForm';
import { IngredientSearchForm, useSearchText } from '../IngredientSearch';
import { useListNavigation } from '../ListFrame';
import SearchSentence from '../SearchSentence';
import { useLiveFacets } from './live-facets';
import { editHeading } from './heading';
import { COMPENDIUM_PATH, PUBLIC_COMPENDIUM_PATH, compendiumHref } from './href';
import { COMPENDIUM_PARAMS } from './params';
import type { CompendiumListFilter, CompendiumListFilterProps } from './types';

// The compendium's filter row (M12.4, on IngredientSearchForm): the name search, then the
// Filters (n) button with its Clear All link and the panel of facets it opens, and above the
// results the search sentence that says what the list is searching for. The panel covers the
// results, so a change in it is held and nothing applies until it shuts: Apply Filters, Escape
// and every other close apply the held facets in one soft navigation (Back steps through,
// reload restores), and nothing held is thrown away. While it is open its counts follow the
// held filter (live-facets.ts); the list and the sentence do not move. Clear All, which sits
// where the page is in view, applies at once. Before hydration the panel is drawn open
// inside this GET form, each facet a native control under the name the parameter table
// reads, and Apply Filters (or Enter in the search box) submits them all. Picking a name in
// the search box's dropdown opens that entry's modal over the list as it is shown, the typed
// text not applied (the owner's call, M8.10). The row has no Clear of its own.
// See claude-docs/components/compendium-list.md.

/** The facets of a filter, the part the panel shows. */
const panelOf = (filter: CompendiumListFilter): FacetPanelFilter => ({
  categories: filter.categories,
  categoryMode: filter.categoryMode,
  forms: filter.forms,
  deities: filter.deities,
  zodiac: filter.zodiac,
  planets: filter.planets,
  elements: filter.elements,
  toxic: filter.toxic ?? '',
  withoutReferences: filter.withoutReferences,
});

/** Nothing chosen: what Clear All holds while the unfiltered list is on its way. */
const NO_FACETS: FacetPanelFilter = {
  categories: [],
  categoryMode: 'all',
  forms: [],
  deities: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: '',
  withoutReferences: false,
};

/** The address of the list under the filter shown, the panel's facets and the name typed set over it. */
const hrefFor = (
  filter: CompendiumListFilter,
  panel: FacetPanelFilter,
  query: string,
  path = COMPENDIUM_PATH,
) =>
  compendiumHref(
    COMPENDIUM_PARAMS.changed(
      { ...filter, query },
      {
        categories: [...panel.categories],
        forms: [...panel.forms],
        deities: [...panel.deities],
        zodiac: [...panel.zodiac],
        planets: [...panel.planets],
        elements: panel.elements.flatMap(
          (each) => INGREDIENT_ELEMENTS.find((element) => element === each) ?? [],
        ),
        toxic: panel.toxic,
        withoutReferences: panel.withoutReferences,
        // Below two categories the mode means nothing, so the address leaves it out.
        categoryMode: panel.categories.length >= 2 ? panel.categoryMode : 'all',
      },
    ),
    undefined,
    path,
  );

/** The facets as held in the panel, laid over the filter shown: what Apply would list. */
const heldFilter = (
  filter: CompendiumListFilter,
  panel: FacetPanelFilter,
  query: string,
): CompendiumListFilter => ({
  ...filter,
  query,
  categories: [...panel.categories],
  forms: [...panel.forms],
  deities: [...panel.deities],
  zodiac: [...panel.zodiac],
  planets: [...panel.planets],
  elements: panel.elements.flatMap(
    (each) => INGREDIENT_ELEMENTS.find((element) => element === each) ?? [],
  ),
  toxic: panel.toxic,
  withoutReferences: panel.withoutReferences,
  categoryMode: panel.categories.length >= 2 ? panel.categoryMode : 'all',
});

/**
 * The panel over what the row holds. A change is held, not applied: the address, the list
 * and the sentence stay as they were until the panel shuts, by Apply Filters or by anything
 * else that closes it, and the counts inside follow the held filter meanwhile.
 */
const PanelFacets = ({
  filter,
  facets,
  categories,
  vocabulary,
  audience = 'admin',
  panel,
  onPanel,
}: CompendiumListFilterProps & {
  panel: FacetPanelFilter;
  onPanel: (next: FacetPanelFilter) => void;
}): ReactElement => {
  const text = useSearchText();
  const apply = useApplyFilter();
  const { pending } = useListNavigation();
  const path = audience === 'admin' ? COMPENDIUM_PATH : PUBLIC_COMPENDIUM_PATH;
  const shown = panelOf(filter);
  const changed = JSON.stringify(panel) !== JSON.stringify(shown);
  const live = useLiveFacets({
    held: heldFilter(filter, panel, text.trim()),
    enabled: changed,
    categories,
    vocabulary,
  });
  return (
    <FacetPanel
      admin={audience === 'admin'}
      facets={live.facets ?? facets}
      filter={panel}
      loading={pending || live.loading}
      clearHref={path}
      className="compendium-list__panel"
      onChange={(patch) => onPanel({ ...panel, ...patch })}
      // Shut any other way than Apply Filters, whose submit applies the name as well: the
      // facets held, under the name the page shows, and nothing at all when none changed.
      onApply={() => {
        if (changed) apply(hrefFor(filter, panel, filter.query, path));
      }}
      onClear={() => {
        onPanel(NO_FACETS);
        apply(path);
      }}
    />
  );
};

const CompendiumListFilterRow = ({
  filter,
  facets,
  categories,
  vocabulary,
  audience = 'admin',
}: CompendiumListFilterProps): ReactElement => {
  const path = audience === 'admin' ? COMPENDIUM_PATH : PUBLIC_COMPENDIUM_PATH;
  // The panel as held: the filter shown until something in it is changed, and the filter
  // shown again whenever a new list arrives (Back, Apply, Clear All). The row is not drawn
  // afresh for a facet, so the open panel and the focus in it survive.
  const shown = panelOf(filter);
  const [panel, setPanel] = useState(shown);
  const [seen, setSeen] = useState(JSON.stringify(shown));
  if (seen !== JSON.stringify(shown)) {
    setSeen(JSON.stringify(shown));
    setPanel(shown);
  }

  return (
    <IngredientSearchForm
      label="Filter the Compendium"
      action={path}
      query={filter.query}
      shown={[]}
      clear={false}
      className="compendium-list__row"
      searchHref={(query) => hrefFor(filter, panel, query, path)}
      // The list as shown, the typed text not applied: the modal opens over it.
      pickHref={(match) =>
        audience === 'admin'
          ? compendiumHref(filter, { edit: match.slug })
          : `/compendium/ingredients/${match.slug}`
      }
      pickHeading={audience === 'admin' ? editHeading : undefined}
    >
      <PanelFacets
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={vocabulary}
        audience={audience}
        panel={panel}
        onPanel={setPanel}
      />
    </IngredientSearchForm>
  );
};

/** What each chosen value is called in the sentence: a deity by its name, a category by its name. */
function labelsOf({
  facets,
  categories,
}: Pick<CompendiumListFilterProps, 'facets' | 'categories'>): SearchSentenceLabels {
  const named = (rows: readonly { value: string; label: string }[]) =>
    Object.fromEntries(rows.map(({ value, label }) => [value, label]));
  // Two gods of one name are told apart by their tradition, as the panel's groups do.
  const sameName = (name: string) =>
    facets.deities.filter(({ label }) => label === name).length > 1;
  return {
    categories: Object.fromEntries(categories.map(({ slug, name }) => [slug, name])),
    deities: Object.fromEntries(
      facets.deities.map(({ value, label, tradition }) => [
        value,
        sameName(label) ? `${label} (${tradition})` : label,
      ]),
    ),
    elements: named(facets.elements),
  };
}

const CompendiumListFilterWithSentence = ({
  filter,
  facets,
  categories,
  vocabulary,
  audience = 'admin',
  total,
}: CompendiumListFilterProps & { total: number }): ReactElement => {
  const { pending } = useListNavigation();
  const sentence = useMemo(
    () =>
      buildSearchSentence({
        filter: { ...filter, toxic: filter.toxic || null },
        labels: labelsOf({ facets, categories }),
        total,
        admin: audience === 'admin',
      }),
    [filter, facets, categories, total, audience],
  );
  return (
    <>
      {/* Keyed by the name searched, so another one starts the box again from it. */}
      <CompendiumListFilterRow
        key={filter.query}
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={vocabulary}
        audience={audience}
      />
      <SearchSentence sentence={sentence} query={filter.query} pending={pending} />
    </>
  );
};

export default CompendiumListFilterWithSentence;
