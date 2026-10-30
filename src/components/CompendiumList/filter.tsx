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
import { DETAILS_PLACE, detailsHeading } from '../IngredientEntry/details';
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

// The compendium's filter row: the name search, the Filters button with its panel of facets and the
// search sentence. The panel holds its changes until it shuts; a coven's list is the same row on
// COVEN_PARAMS (claude-docs/components/compendium-list.md, "The filter row").

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

/**
 * The facets of a filter, the part the panel shows; a coven's adds its three choices, and the
 * admin's its Reviewed strip.
 */
const panelOf = (filter: Held, coven: boolean, admin: boolean): FacetPanelFilter => ({
  covens: filter.covens ?? [],
  covensNot: filter.covensNot ?? false,
  categories: filter.categories,
  categoryMode: filter.categoryMode,
  forms: filter.forms,
  deities: filter.deities,
  zodiac: filter.zodiac,
  celestialBodies: filter.celestialBodies,
  elements: filter.elements,
  toxic: filter.toxic ?? '',
  withoutReferences: filter.withoutReferences,
  withoutForms: filter.withoutForms,
  ...(admin && { reviewed: filter.reviewed ?? '' }),
  ...(coven && {
    source: filter.source ?? '',
    inStock: filter.inStock ?? false,
    lowStockOnly: filter.lowStockOnly ?? false,
  }),
});

/** Nothing chosen: what Clear All holds while the unfiltered list is on its way. */
const noFacets = (coven: boolean, admin: boolean): FacetPanelFilter => ({
  covens: [],
  covensNot: false,
  categories: [],
  categoryMode: 'all',
  forms: [],
  deities: [],
  zodiac: [],
  celestialBodies: [],
  elements: [],
  toxic: '',
  withoutReferences: false,
  withoutForms: false,
  ...(admin && { reviewed: '' as const }),
  ...(coven && { source: '', inStock: false, lowStockOnly: false }),
});

/** The panel's facets as filter values. */
const changeOf = (panel: FacetPanelFilter) => ({
  covens: [...(panel.covens ?? [])],
  covensNot: panel.covensNot ?? false,
  categories: [...panel.categories],
  forms: [...panel.forms],
  deities: [...panel.deities],
  zodiac: [...panel.zodiac],
  celestialBodies: [...panel.celestialBodies],
  elements: panel.elements.flatMap(
    (each) => INGREDIENT_ELEMENTS.find((element) => element === each) ?? [],
  ),
  toxic: panel.toxic,
  withoutReferences: panel.withoutReferences,
  withoutForms: panel.withoutForms,
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
    COMPENDIUM_PARAMS.changed(
      { ...filter, reviewed: filter.reviewed ?? '', query },
      { ...changeOf(panel), reviewed: panel.reviewed ?? '' },
    ),
    undefined,
    where.path,
  );
};

/** The facets as held in the panel, laid over the filter shown: what Apply would list. */
const heldFilter = (filter: Held, panel: FacetPanelFilter, query: string): Held => ({
  ...filter,
  query,
  ...changeOf(panel),
  ...(panel.reviewed !== undefined && { reviewed: panel.reviewed }),
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
  covens,
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
  const shown = panelOf(filter, coven, audience === 'admin');
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
      covens={covens}
      onChange={(patch) => onPanel({ ...panel, ...patch })}
      // Shut any other way than Apply Filters, whose submit applies the name as well: the
      // facets held, under the name the page shows, and nothing at all when none changed.
      onApply={() => {
        if (changed) apply(hrefFor(filter, panel, filter.query, where));
      }}
      onClear={() => {
        onPanel(noFacets(coven, audience === 'admin'));
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
  covens,
  cursor,
}: CompendiumListFilterProps): ReactElement => {
  const where = whereOf({ audience, covenSlug });
  const coven = where.covenSlug !== undefined;
  // The panel as held: the filter shown until something in it is changed, and the filter
  // shown again whenever a new list arrives (Back, Apply, Clear All). The row is not drawn
  // afresh for a facet, so the open panel and the focus in it survive.
  const shown = panelOf(filter, coven, audience === 'admin');
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
      source={coven && workspaceId ? { kind: 'cupboard', workspaceId } : undefined}
      // The entry's Quick Look over the list as shown, its page kept and the typed text not
      // applied, keyed as the list's eye keys it: the admin's by slug, the other two by id.
      pickHref={(match) => {
        const place = { ...filter, ...cursor };
        if (where.covenSlug !== undefined) {
          return covenIngredientsHref(where.covenSlug, { ...place, entry: match.id });
        }
        return audience === 'admin'
          ? compendiumHref({ ...place, entry: match.slug })
          : compendiumHref({ ...place, entry: match.id }, undefined, PUBLIC_COMPENDIUM_PATH);
      }}
      pickHeading={detailsHeading}
      pickPlace={DETAILS_PLACE}
    >
      <PanelFacets
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={vocabulary}
        audience={audience}
        covenSlug={covenSlug}
        workspaceId={workspaceId}
        covens={covens}
        panel={panel}
        onPanel={setPanel}
      />
      {/* The coven's cards can be compact or regular; a view setting, so it sits in the
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
  covens = [],
}: Pick<CompendiumListFilterProps, 'facets' | 'categories' | 'covens'>): SearchSentenceLabels {
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
    // Only the viewer's own covens have a name here, so only they are named.
    covens: Object.fromEntries(covens.map(({ id, name }) => [id, name])),
  };
}

/**
 * The filter an address holds, read as the page reads it from the same parameter table: the
 * term and every facet, a parameter the address lacks being no filter. `shown` supplies what
 * the table does not carry.
 */
function filterOf(href: string, shown: Held, coven: boolean): Held {
  const params: Record<string, string[]> = {};
  const { searchParams } = new URL(href, 'http://localhost');
  for (const key of new Set(searchParams.keys())) params[key] = searchParams.getAll(key);
  return { ...shown, ...(coven ? COVEN_PARAMS : COMPENDIUM_PARAMS).read(params) };
}

const CompendiumListFilterWithSentence = ({
  filter,
  facets,
  categories,
  vocabulary,
  audience = 'admin',
  covenSlug,
  workspaceId,
  covens,
  cursor,
  total,
}: CompendiumListFilterProps & { total: number }): ReactElement => {
  // Only a filter's navigation retypes the sentence: a pager press changes the page, not the
  // search.
  const { searching, target } = useListNavigation();
  // The page still shows the previous search while the new one is read, so the sentence names the
  // term and the facets of the address the navigation is opening, not those of `filter`.
  const searched =
    searching && target !== undefined
      ? filterOf(target, filter, whereOf({ audience, covenSlug }).covenSlug !== undefined)
      : filter;
  const sentence = useMemo(
    () =>
      buildSearchSentence({
        filter: {
          ...searched,
          toxic: searched.toxic || null,
          reviewed: searched.reviewed || null,
          source: searched.source || null,
          inStock: searched.inStock ?? false,
          lowStockOnly: searched.lowStockOnly ?? false,
        },
        labels: labelsOf({ facets, categories, covens }),
        total,
        admin: audience === 'admin',
      }),
    [searched, facets, categories, covens, total, audience],
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
        covens={covens}
        cursor={cursor}
      />
      <SearchSentence sentence={sentence} query={searched.query} pending={searching} />
    </>
  );
};

export default CompendiumListFilterWithSentence;
