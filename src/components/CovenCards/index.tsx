import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import JarLines from '../JarLines';
import EmptyCupboard from './empty';
import type { CovenCardsProps } from './types';
import '../CompendiumList/index.scss';

// A coven's Ingredients list (M9.6), the twin of CompendiumCards: the filter row in its coven
// mode, one compact card per entry of the cupboard, and the pager. Render-only: the page reads
// one page and hands it here. Each card links to the entry's page inside the coven, shows the
// coven's own label, and holds its jars beneath the forms. The foot of a card (Edit, Delete)
// stays empty until M8.17 and M9.10 fill it. An empty list is EmptyCupboard's (M9.11).
// claude-docs/components/coven-cards.md.

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
  canAdd,
}: CovenCardsProps): ReactElement => (
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
            toxic={entry.toxic}
            safetyNotes={entry.safetyNotes}
            kind={entry.kind}
            annotated={entry.annotated}
            retired={entry.retired}
          >
            {entry.jars.length > 0 && <JarLines jars={entry.jars} />}
          </IngredientCard>
        ))}
      </IngredientCardList>
    )}
  </IngredientSearch>
);

export default CovenCards;
