'use client';

import { covenPath } from '@/lib/coven-path';
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
import { facetChoices, vocabulariesOf } from './facets';
import { useLiveFacets } from './live-facets';
import { DETAILS_PLACE, detailsHeading } from '../IngredientEntry/details';
import { COVEN_PARAMS } from '../IngredientSearch/coven-params';
import {
  COMPENDIUM_PATH,
  PUBLIC_COMPENDIUM_PATH,
  compendiumHref,
  covenIngredientsHref,
} from './href';
import { COMPENDIUM_PARAMS } from './params';
import type { CompendiumFacetCounts, CompendiumListFilterProps } from './types';

// The compendium's filter row: the name search, the Filters button with its panel of facets and the
// search sentence. The panel holds its changes until it shuts; a coven's list is the same row on
// COVEN_PARAMS (claude-docs/components/compendium-list.md, "The filter row").

type Held = CompendiumListFilterProps['filter'];

/** The row's props, with the counts already drawn into choices once. */
type RowProps = Omit<CompendiumListFilterProps, 'counts'> & { facets: CompendiumFacetCounts };

interface Where {
  path: Route;
  covenSlug?: string;
}

const whereOf = ({
  audience = 'admin',
  covenSlug,
}: Pick<CompendiumListFilterProps, 'audience' | 'covenSlug'>): Where => {
  if (audience === 'coven' && covenSlug !== undefined) {
    return { path: covenPath(covenSlug, 'ingredients'), covenSlug };
  }
  return { path: audience === 'admin' ? COMPENDIUM_PATH : PUBLIC_COMPENDIUM_PATH };
};

// What each facet holds when nothing is chosen. One list drives `panelOf` and `noFacets`, so the two lay their
// keys out in the same order, which the `JSON.stringify` comparisons of a panel against the filter shown rely on.
const FACET_DEFAULTS = {
  covens: [] as readonly string[],
  covensNot: false,
  categories: [] as readonly string[],
  categoryMode: 'all' as FacetPanelFilter['categoryMode'],
  forms: [] as readonly string[],
  deities: [] as readonly string[],
  zodiac: [] as readonly string[],
  celestialBodies: [] as readonly string[],
  elements: [] as readonly string[],
  toxic: '' as FacetPanelFilter['toxic'],
  withoutReferences: false,
  withoutForms: false,
};
const ADMIN_FACET_DEFAULTS = { reviewed: '' as const, hidden: false };
const COVEN_FACET_DEFAULTS = { source: '' as const, inStock: false, lowStockOnly: false };

/** The facets a panel of this kind holds, each at its default. */
const facetDefaults = (coven: boolean, admin: boolean) => ({
  ...FACET_DEFAULTS,
  ...(admin && ADMIN_FACET_DEFAULTS),
  ...(coven && COVEN_FACET_DEFAULTS),
});

const panelOf = (filter: Held, coven: boolean, admin: boolean): FacetPanelFilter => {
  const defaults: Record<string, unknown> = facetDefaults(coven, admin);
  const held: Record<string, unknown> = filter;
  return Object.fromEntries(
    Object.entries(defaults).map(([key, none]) => [key, held[key] ?? none]),
  ) as unknown as FacetPanelFilter;
};

const noFacets = (coven: boolean, admin: boolean): FacetPanelFilter => facetDefaults(coven, admin);

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
      { ...filter, reviewed: filter.reviewed ?? '', hidden: filter.hidden ?? false, query },
      { ...changeOf(panel), reviewed: panel.reviewed ?? '', hidden: panel.hidden ?? false },
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
  ...(panel.hidden !== undefined && { hidden: panel.hidden }),
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
}: RowProps & {
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
    admin: audience === 'admin',
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
}: RowProps): ReactElement => {
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

function labelsOf({
  facets,
  categories,
  covens = [],
}: Pick<RowProps, 'facets' | 'categories' | 'covens'>): SearchSentenceLabels {
  const named = (rows: readonly { value: string; label: string }[]) =>
    Object.fromEntries(rows.map(({ value, label }) => [value, label]));
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
    covens: Object.fromEntries(covens.map(({ id, name }) => [id, name])),
  };
}

function filterOf(href: string, shown: Held, coven: boolean): Held {
  const params: Record<string, string[]> = {};
  const { searchParams } = new URL(href, 'http://localhost');
  for (const key of new Set(searchParams.keys())) params[key] = searchParams.getAll(key);
  return { ...shown, ...(coven ? COVEN_PARAMS : COMPENDIUM_PARAMS).read(params) };
}

const CompendiumListFilterWithSentence = ({
  filter,
  counts,
  categories,
  vocabulary,
  audience = 'admin',
  covenSlug,
  workspaceId,
  covens,
  cursor,
  total,
}: CompendiumListFilterProps & { total: number }): ReactElement => {
  const { searching, target } = useListNavigation();
  // The choices, named from the vocabularies here rather than sent named: each category and deity
  // then reaches the browser once.
  const facets = useMemo(
    () => facetChoices(counts, vocabulariesOf(categories, vocabulary)),
    [counts, categories, vocabulary],
  );
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
      {/* An empty list with no filter says so itself, so the count line stays out. */}
      {(total > 0 || sentence.hasFilter) && (
        <SearchSentence sentence={sentence} query={searched.query} pending={searching} />
      )}
    </>
  );
};

export default CompendiumListFilterWithSentence;
