import type { Route } from 'next';
import type { ReactElement } from 'react';
import CompendiumListFilter from '../CompendiumList/filter';
import { emptyText } from '../CompendiumList';
import { AnnotateLink, EditLink } from '../IconTip';
import { ANNOTATE_HEADING } from '../IngredientEntry/annotate-heading';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import JarLines from '../JarLines';
import type { CovenCardEntry, CovenCardsProps } from './types';
import '../CompendiumList/index.scss';

// A coven's Ingredients list (M9.6), the twin of CompendiumCards: the filter row in its coven
// mode, one compact card per entry of the cupboard, and the pager. Render-only: the page reads
// one page and hands it here. Each card links to the entry's page inside the coven, shows the
// coven's own label, and holds its jars beneath the forms. The foot of a card holds Edit where
// the page gives the entry an edit address (M8.17): the coven's own entries, for a role that
// may update them; and Annotate where it gives an annotate address: the compendium entries the
// cupboard holds, for the same role. Delete waits for M9.10. An empty list is plain text until
// M9.11 builds its empty state. claude-docs/components/coven-cards.md.

// Named with the formal name too, as two entries can share a label.
const nameOf = (entry: CovenCardEntry): string =>
  entry.canonicalName ? `${entry.label}, ${entry.canonicalName}` : entry.label;

// The foot's one control: Edit on the coven's own entry, Annotate on a compendium entry the
// cupboard holds, each only where the page gave its address.
const actionsOf = (entry: CovenCardEntry): ReactElement | undefined => {
  if (entry.editHref && entry.editHeading)
    return <EditLink href={entry.editHref} heading={entry.editHeading} name={nameOf(entry)} />;
  if (entry.annotateHref)
    return (
      <AnnotateLink href={entry.annotateHref} heading={ANNOTATE_HEADING} name={nameOf(entry)} />
    );
  return undefined;
};

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
      <p>{emptyText(filter, categories, facets, 'There are no ingredients here yet.')}</p>
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
            actions={actionsOf(entry)}
          >
            {entry.jars.length > 0 && <JarLines jars={entry.jars} />}
          </IngredientCard>
        ))}
      </IngredientCardList>
    )}
  </IngredientSearch>
);

export default CovenCards;
