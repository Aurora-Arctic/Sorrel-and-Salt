import type { ReactElement } from 'react';
import { cardName } from '../../lib/ingredient-name';
import CompendiumListFilter from '../CompendiumList/filter';
import DetailsLink from '../IngredientEntry/details-link';
import IngredientCard from '../IngredientCard';
import { CardCategoryVocabulary } from '../IngredientCard/category-vocabulary';
import IngredientCardList from '../IngredientCardList';
import { ListBodySkeleton } from '../ListFrame/skeleton';
import IngredientSearch from '../IngredientSearch';
import JarLines from '../JarLines';
import { covenCardActions } from './actions';
import EmptyCupboard from './empty';
import type { CovenCardsProps } from './types';
import '../CompendiumList/index.scss';
import { covenPath } from '@/lib/coven-path';

// A coven's Ingredients list, the twin of CompendiumCards: the filter row in coven mode, compact cards and the pager.
// Render-only. The foot holds Edit or Annotate and More (`card-more.tsx`) (claude-docs/components/coven-cards.md).
// The wrapper's `data-density` draws the loading skeleton compact, as the cards are.

const CovenCards = ({
  covenSlug,
  workspaceId,
  entries,
  filter,
  counts,
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
      skeleton={<ListBodySkeleton label="Ingredients" density="compact" />}
      search={
        <CompendiumListFilter
          audience="coven"
          covenSlug={covenSlug}
          workspaceId={workspaceId}
          filter={filter}
          counts={counts}
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
        <CardCategoryVocabulary categories={categories}>
          <IngredientCardList label="Ingredients" density="compact">
            {entries.map((entry) => (
              <IngredientCard
                key={entry.id}
                href={covenPath(covenSlug, 'ingredients', entry.id)}
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
                startActions={
                  <DetailsLink
                    opens={entry.details}
                    name={cardName(entry.label, entry.canonicalName)}
                  />
                }
              >
                {entry.jars.length > 0 && <JarLines jars={entry.jars} />}
              </IngredientCard>
            ))}
          </IngredientCardList>
        </CardCategoryVocabulary>
      )}
    </IngredientSearch>
  </div>
);

export default CovenCards;
