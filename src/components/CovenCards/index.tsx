import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import DetailsLink from '../IngredientEntry/details-link';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import JarLines from '../JarLines';
import { covenCardActions, covenCardName } from './actions';
import EmptyCupboard from './empty';
import type { CovenCardsProps } from './types';
import '../CompendiumList/index.scss';

// A coven's Ingredients list, the twin of CompendiumCards: the filter row in coven mode, compact cards
// linking to the entry's page in the coven, and the pager. Render-only. The foot holds Edit or Annotate
// for a role that may update, and More (`card-more.tsx`) (claude-docs/components/coven-cards.md).
// The wrapper's `data-density` draws the loading skeleton compact, as the cards are.

const CovenCards = ({
  covenSlug,
  workspaceId,
  entries,
  filter,
  facets,
  categories,
  vocabulary,
  previousHref,
  nextHref,
  position,
  total,
  cursor,
  canAdd,
}: CovenCardsProps): ReactElement => (
  <div data-density="compact">
    <IngredientSearch
      shape="cards"
      search={
        <CompendiumListFilter
          audience="coven"
          covenSlug={covenSlug}
          workspaceId={workspaceId}
          filter={filter}
          facets={facets}
          categories={categories}
          vocabulary={vocabulary}
          total={total}
          cursor={cursor}
        />
      }
      previousHref={previousHref}
      nextHref={nextHref}
      position={position}
    >
      {entries.length === 0 ? (
        <EmptyCupboard covenSlug={covenSlug} filter={filter} canAdd={canAdd} />
      ) : (
        <IngredientCardList label="Ingredients" density="compact">
          {entries.map((entry) => (
            <IngredientCard
              key={entry.id}
              href={`/coven/${covenSlug}/ingredients/${entry.id}` as Route}
              label={entry.label}
              formalName={entry.canonicalName}
              nomenclature={entry.nomenclature}
              categories={entry.categories}
              variants={entry.variants}
              forms={false}
              toxic={entry.toxic}
              safetyNotes={entry.safetyNotes}
              kind={entry.kind}
              retired={entry.retired}
              lastEdit={entry.lastEdit}
              actions={covenCardActions(entry, workspaceId, covenSlug)}
              startActions={<DetailsLink opens={entry.details} name={covenCardName(entry)} />}
            >
              {entry.jars.length > 0 && <JarLines jars={entry.jars} />}
            </IngredientCard>
          ))}
        </IngredientCardList>
      )}
    </IngredientSearch>
  </div>
);

export default CovenCards;
