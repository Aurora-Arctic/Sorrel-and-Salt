'use client';

import type { Route } from 'next';
import { type ReactElement, useMemo, useState } from 'react';
import { INGREDIENT_ELEMENTS } from '@/modules/ingredients/schema/ingredient-enums';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { SearchSentenceLabels } from '../IngredientSearch/types';
import CardDensitySwitch from '../CardDensitySwitch';
import FacetPanel from '../FacetPanel';
import type { FacetPanelFilter } from '../FacetPanel/types';
import { useApplyFilter } from '../FilterForm';
import { IngredientSearchForm, useSearchText } from '../IngredientSearch';
import { useListNavigation } from '../ListFrame';
import SearchSentence from '../SearchSentence';
import { useLiveFacets } from './live-facets';
import { editHeading } from './heading';
import { COVEN_PARAMS } from '../IngredientSearch/coven-params';
import {
  COMPENDIUM_PATH,
  PUBLIC_COMPENDIUM_PATH,
  compendiumHref,
  covenIngredientsHref,
  covenIngredientsPath,
} from './href';
import { COMPENDIUM_PARAMS } from './params';
import type { CompendiumListFilterProps } from './types';

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
// A coven's list (M9.6, `audience="coven"`) is the same row on COVEN_PARAMS: it adds the Source,
// In Stock and Low Stock Only choices, reads its live counts from the coven's cupboard, suggests
// from it, and opens a pick at the entry's page under /coven/<slug>/ingredients.
// See claude-docs/components/compendium-list.md.

type Held = CompendiumListFilterProps['filter'];

/** Where a list lives: its path, and the coven's slug for a coven's list. */
interface Where {
  path: Route;
  covenSlug?: string;
}

const whereOf = ({
  audience = 'admin',
  covenSlug,
}: Pick<CompendiumListFilterProps, 'audience' | 'covenSlug'>): Where => {
  if (audience === 'coven' && covenSlug !== undefined) {
    return { path: covenIngredientsPath(covenSlug), covenSlug };
  }
  return { path: audience === 'admin' ? COMPENDIUM_PATH : PUBLIC_COMPENDIUM_PATH };
};

/** The facets of a filter, the part the panel shows; a coven's adds its three choices. */
const panelOf = (filter: Held, coven: boolean): FacetPanelFilter => ({
  categories: filter.categories,
  categoryMode: filter.categoryMode,
  forms: filter.forms,
  deities: filter.deities,
  zodiac: filter.zodiac,
  planets: filter.planets,
  elements: filter.elements,
  toxic: filter.toxic ?? '',
  withoutReferences: filter.withoutReferences,
  ...(coven && {
    source: filter.source ?? '',
    inStock: filter.inStock ?? false,
    lowStockOnly: filter.lowStockOnly ?? false,
  }),
});

/** Nothing chosen: what Clear All holds while the unfiltered list is on its way. */
const noFacets = (coven: boolean): FacetPanelFilter => ({
  categories: [],
  categoryMode: 'all',
  forms: [],
  deities: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: '',
  withoutReferences: false,
  ...(coven && { source: '', inStock: false, lowStockOnly: false }),
});

/** The panel's facets as filter values. */
const changeOf = (panel: FacetPanelFilter) => ({
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
  categoryMode: panel.categories.length >= 2 ? panel.categoryMode : ('all' as const),
});

/** The address of the list under the filter shown, the panel's facets and the name typed set over it. */
const hrefFor = (filter: Held, panel: FacetPanelFilter, query: string, where: Where) => {
  if (where.covenSlug !== undefined) {
    return covenIngredientsHref(
      where.covenSlug,
      COVEN_PARAMS.changed(
        { ...filter, query },
        {
          ...changeOf(panel),
          source: panel.source ?? '',
          inStock: panel.inStock ?? false,
          lowStockOnly: panel.lowStockOnly ?? false,
        },
      ),
    );
  }
  return compendiumHref(
    COMPENDIUM_PARAMS.changed({ ...filter, query }, changeOf(panel)),
    undefined,
    where.path,
  );
};

/** The facets as held in the panel, laid over the filter shown: what Apply would list. */
const heldFilter = (filter: Held, panel: FacetPanelFilter, query: string): Held => ({
  ...filter,
  query,
  ...changeOf(panel),
  ...(panel.source !== undefined && {
    source: panel.source,
    inStock: panel.inStock ?? false,
    lowStockOnly: panel.lowStockOnly ?? false,
  }),
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
  covenSlug,
  workspaceId,
  panel,
  onPanel,
}: CompendiumListFilterProps & {
  panel: FacetPanelFilter;
  onPanel: (next: FacetPanelFilter) => void;
}): ReactElement => {
  const text = useSearchText();
  const apply = useApplyFilter();
  const { pending } = useListNavigation();
  const where = whereOf({ audience, covenSlug });
  const coven = where.covenSlug !== undefined;
  const shown = panelOf(filter, coven);
  const changed = JSON.stringify(panel) !== JSON.stringify(shown);
  const live = useLiveFacets({
    held: heldFilter(filter, panel, text.trim()),
    enabled: changed,
    categories,
    vocabulary,
    workspaceId: coven ? workspaceId : undefined,
  });
  return (
    <FacetPanel
      admin={audience === 'admin'}
      facets={live.facets ?? facets}
      filter={panel}
      loading={pending || live.loading}
      clearHref={where.path}
      className="compendium-list__panel"
      onChange={(patch) => onPanel({ ...panel, ...patch })}
      // Shut any other way than Apply Filters, whose submit applies the name as well: the
      // facets held, under the name the page shows, and nothing at all when none changed.
      onApply={() => {
        if (changed) apply(hrefFor(filter, panel, filter.query, where));
      }}
      onClear={() => {
        onPanel(noFacets(coven));
        apply(where.path);
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
  covenSlug,
  workspaceId,
}: CompendiumListFilterProps): ReactElement => {
  const where = whereOf({ audience, covenSlug });
  const coven = where.covenSlug !== undefined;
  // The panel as held: the filter shown until something in it is changed, and the filter
  // shown again whenever a new list arrives (Back, Apply, Clear All). The row is not drawn
  // afresh for a facet, so the open panel and the focus in it survive.
  const shown = panelOf(filter, coven);
  const [panel, setPanel] = useState(shown);
  const [seen, setSeen] = useState(JSON.stringify(shown));
  if (seen !== JSON.stringify(shown)) {
    setSeen(JSON.stringify(shown));
    setPanel(shown);
  }

  return (
    <IngredientSearchForm
      label={coven ? 'Filter Ingredients' : 'Filter the Compendium'}
      action={where.path}
      query={filter.query}
      shown={[]}
      clear={false}
      className="compendium-list__row"
      searchHref={(query) => hrefFor(filter, panel, query, where)}
      workspaceId={coven ? workspaceId : undefined}
      // The list as shown, the typed text not applied: the modal opens over it.
      pickHref={(match) => {
        if (where.covenSlug !== undefined) {
          return `${where.path}/${match.id}` as Route;
        }
        return audience === 'admin'
          ? compendiumHref(filter, { edit: match.slug })
          : (`/compendium/ingredients/${match.slug}` as Route);
      }}
      pickHeading={audience === 'admin' ? editHeading : undefined}
    >
      <PanelFacets
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={vocabulary}
        audience={audience}
        covenSlug={covenSlug}
        workspaceId={workspaceId}
        panel={panel}
        onPanel={setPanel}
      />
      {/* The coven's cards can be compact or regular (M9.6); a view setting, so it sits in the
          row with the filters, inside the search landmark, and submits nothing. Rendered here, not
          passed in as a slot: both are client components and the props stay plain data. */}
      {coven ? <CardDensitySwitch /> : null}
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
  covenSlug,
  workspaceId,
  total,
}: CompendiumListFilterProps & { total: number }): ReactElement => {
  const { pending } = useListNavigation();
  const sentence = useMemo(
    () =>
      buildSearchSentence({
        filter: {
          ...filter,
          toxic: filter.toxic || null,
          source: filter.source || null,
          inStock: filter.inStock ?? false,
          lowStockOnly: filter.lowStockOnly ?? false,
        },
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
        covenSlug={covenSlug}
        workspaceId={workspaceId}
      />
      <SearchSentence sentence={sentence} query={filter.query} pending={pending} />
    </>
  );
};

export default CompendiumListFilterWithSentence;
