import type { Story } from '@ladle/react';
import IngredientCard from '../IngredientCard';
import { ENTRIES, jarLinesOf } from './story-fixtures';
import IngredientCardList from '.';

// Render-only; the wrapping and the density are asserted in tests/components/IngredientCardList.
// The same nine entries in every grid, for the two pages that use the list: the public
// compendium (M8.18: no marks of whose, no jars, no actions) and the coven's Ingredients
// page (M9.6: marks, jar lines, Edit and Delete). The preview ignores `meta.width`, so set
// the viewport to see the columns change.
export default {
  title: 'Surfaces / Ingredient Card List',
};

const CompendiumCards = () => (
  <IngredientCardList label="Compendium">
    {ENTRIES.map((e) => (
      <IngredientCard
        key={e.slug}
        href={`/compendium/ingredients/${e.slug}` as const}
        label={e.label}
        formalName={e.formalName}
        nomenclature={e.nomenclature}
        categories={e.categories}
        variants={e.variants}
        toxic={e.toxic}
        safetyNotes={e.safetyNotes}
        kind="compendium"
      />
    ))}
  </IngredientCardList>
);

const CupboardCards = ({ density }: { density?: 'regular' | 'compact' }) => (
  <IngredientCardList label="Ingredients" density={density}>
    {ENTRIES.map((e) => (
      <IngredientCard
        key={e.slug}
        href={`/coven/test-coven/ingredients/${e.slug}` as const}
        label={e.label}
        formalName={e.formalName}
        nomenclature={e.nomenclature}
        categories={e.categories}
        variants={e.variants}
        toxic={e.toxic}
        safetyNotes={e.safetyNotes}
        kind={e.kind}
        annotated={e.annotated}
        retired={e.retired}
        actions={
          <>
            <button type="button" className="btn btn--small">
              Edit
            </button>
            <button type="button" className="btn btn--small btn--destructive">
              Delete
            </button>
          </>
        }
      >
        {jarLinesOf(e)}
      </IngredientCard>
    ))}
  </IngredientCardList>
);

export const CompendiumGrid: Story = () => <CompendiumCards />;
export const CupboardGrid: Story = () => <CupboardCards />;
export const CupboardGridCompact: Story = () => <CupboardCards density="compact" />;
