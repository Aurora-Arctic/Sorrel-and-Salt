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
import type { CovenCardEntry, CovenCardsProps } from './types';
import '../CompendiumList/index.scss';

// A coven's Ingredients list (M9.6), the twin of CompendiumCards: the filter row in its coven
// mode, one compact card per entry of the cupboard, and the pager. Render-only: the page reads
// one page and hands it here. Each card links to the entry's page inside the coven, shows the
// coven's own label, and holds its jars where the forms line would be: a coven card draws no forms line (M9.9). The foot of a card holds Edit where
// the page gives the entry an edit address (M8.17): the coven's own entries, for a role that
// may update them; and Annotate where it gives an annotate address: the compendium entries the
// cupboard holds, for the same role. Beside it, the card's More (`card-more.tsx`): Delete on
// an own entry, Make It Ours and Remove on a compendium one. An empty list is
// EmptyCupboard's (M9.11). claude-docs/components/coven-cards.md.

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
);

export default CovenCards;
