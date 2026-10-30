'use client';

import type { Route } from 'next';
import { moonPhaseIcon } from '../SpellBuilder/moon-phase-icon';
import FacetCombobox from '../FacetCombobox';
import CardDensitySwitch from '../CardDensitySwitch';
import { type ReactElement, useMemo, useState } from 'react';
import type { CategoryMode } from '@/modules/ingredients/schema/ingredient-enums';
import { ChoiceChip } from '../FacetPanel/choice-chip';
import { CategoryLine } from '../FacetPanel/category-line';
import { FacetShell } from '../FacetPanel/shell';
import { useApplyFilter } from '../FilterForm';
import { IngredientSearchForm } from '../IngredientSearch';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import { useListNavigation } from '../ListFrame';
import SearchSentence from '../SearchSentence';
import { GRIMOIRE_PARAMS } from './params';
import { SPELL_LOOK_PLACE } from '../SpellCard';
import { lookHrefOf } from './recipe-href';
import { nounOf } from './noun';
import type { GrimoireFilterProps, GrimoireListFilter } from './types';

// The grimoire's filter row, the compendium's (CompendiumList/filter.tsx) on the grimoire's parameters:
// the title search and the Filters (n) panel, holding the Categories line alone, applied in one soft
// navigation when it shuts. Spells and Drafts are two tabs, not a status filter (claude-docs/components/grimoire-list.md).

/** What the panel holds: the categories and their match mode, then the four facets. */
interface Held {
  categories: readonly string[];
  categoryMode: CategoryMode;
  moonPhases: readonly string[];
  daysOfWeek: readonly string[];
  visibility: GrimoireListFilter['visibility'];
  makers: readonly string[];
}

const heldOf = ({
  categories,
  categoryMode,
  moonPhases,
  daysOfWeek,
  visibility,
  makers,
}: GrimoireListFilter): Held => ({
  categories,
  categoryMode,
  moonPhases,
  daysOfWeek,
  visibility,
  makers,
});

const NONE: Held = {
  categories: [],
  categoryMode: 'all',
  moonPhases: [],
  daysOfWeek: [],
  visibility: '',
  makers: [],
};

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
        moonPhases: [...held.moonPhases],
        daysOfWeek: [...held.daysOfWeek],
        visibility: held.visibility,
        makers: [...held.makers],
      },
    ),
  ) as Route;

const PanelCategories = ({
  path,
  filter,
  categories,
  facets,
  held,
  onHeld,
}: Pick<GrimoireFilterProps, 'path' | 'filter' | 'categories' | 'facets'> & {
  held: Held;
  onHeld: (next: Held) => void;
}): ReactElement => {
  const apply = useApplyFilter();
  const { pending } = useListNavigation();
  const changed = JSON.stringify(held) !== JSON.stringify(heldOf(filter));
  const visibilityStuck = facets.visibilities.some((choice) => choice.count === 0);
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
      count={
        held.categories.length +
        held.moonPhases.length +
        held.daysOfWeek.length +
        (held.visibility === '' ? 0 : 1) +
        held.makers.length
      }
      clearHref={path}
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
      <div className="facet-panel__line">
        <div className="facet-panel__grow">
          <FacetCombobox
            label="Moon Phase"
            name="moonPhase"
            typeahead
            placeholder="Add a moon phase"
            removeNoun="Moon Phase"
            loading={pending}
            choices={facets.moonPhases.map((choice) => ({
              ...choice,
              icon: moonPhaseIcon(choice.label),
            }))}
            values={held.moonPhases}
            onChange={(moonPhases) => onHeld({ ...held, moonPhases })}
          />
        </div>
        <div className="facet-panel__grow">
          <FacetCombobox
            label="Day of Week"
            name="dayOfWeek"
            typeahead
            placeholder="Add a day"
            removeNoun="Day"
            loading={pending}
            choices={facets.daysOfWeek}
            values={held.daysOfWeek}
            onChange={(daysOfWeek) => onHeld({ ...held, daysOfWeek })}
          />
        </div>
      </div>
      <div className="facet-panel__line">
        <div className="facet-panel__grow">
          <FacetCombobox
            label="Coven Member"
            name="maker"
            typeahead
            placeholder="Add a member"
            removeNoun="Member"
            loading={pending}
            choices={facets.makers}
            values={held.makers}
            onChange={(makers) => onHeld({ ...held, makers })}
          />
        </div>
        <div className="facet-panel__quick">
          <ChoiceChip
            legend="Visibility"
            name="visibility"
            options={[
              { value: '', label: 'Any' },
              ...facets.visibilities.map(({ value, label, count }) => ({
                value: value as Held['visibility'],
                label,
                count,
              })),
            ]}
            // Drawn and placed as the compendium's Toxic is: both values always show, and with
            // either at zero every spell shares one visibility, so the chip rests on Any.
            value={visibilityStuck ? '' : held.visibility}
            disabled={visibilityStuck}
            chipHint={
              visibilityStuck
                ? 'Every matching spell shares the same visibility, so this filter cannot narrow further.'
                : undefined
            }
            onChange={(visibility) => onHeld({ ...held, visibility })}
          />
        </div>
      </div>
    </FacetShell>
  );
};

const GrimoireFilterRow = ({
  path,
  workspaceId,
  cursor,
  status,
  filter,
  categories,
  facets,
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
      className="grimoire-list__row"
      searchHref={(query) => hrefFor(path, filter, held, query)}
      // A picked title opens the spell's Quick Look over the list as shown, as the card's eye
      // does: the page and the filter kept, the text typed and not searched not applied.
      pickHref={({ id }) => lookHrefOf(GRIMOIRE_PARAMS.href(path, filter, { ...cursor }), id)}
      pickHeading={({ name }) => ({ title: name })}
      pickPlace={SPELL_LOOK_PLACE}
      source={{ kind: 'grimoire', workspaceId, status }}
    >
      <PanelCategories
        path={path}
        filter={filter}
        categories={categories}
        facets={facets}
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
  cursor,
  status,
  filter,
  categories,
  facets,
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
          visibilities: Object.fromEntries(
            facets.visibilities.map(({ value, label }) => [value, label]),
          ),
          makers: Object.fromEntries(facets.makers.map(({ value, label }) => [value, label])),
        },
        total,
        noun: nounOf(status),
      }),
    [searched, categories, facets, total, status],
  );
  return (
    <>
      {/* Keyed by the text searched, so another one starts the box again from it. */}
      <GrimoireFilterRow
        key={filter.query}
        path={path}
        workspaceId={workspaceId}
        cursor={cursor}
        status={status}
        filter={filter}
        categories={categories}
        facets={facets}
      />
      <SearchSentence sentence={sentence} query={searched.query} pending={searching} />
    </>
  );
};

export default GrimoireFilter;
