import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import IngredientCard from '../IngredientCard';
import { ENTRIES, jarLinesOf } from './story-fixtures';
import IngredientCardList from '.';
import { route } from '../../../.storybook/route';

// Render-only; the wrapping and the density are asserted in tests/components/IngredientCardList.
// The same nine entries in every grid, for the two pages that use the list: the public
// compendium (M8.18: no marks of whose, no jars, no actions) and the coven's Ingredients
// page (M9.6: marks, jar lines, Edit and Delete). The preview ignores `meta.width`, so set
// the viewport to see the columns change.
const meta = {
  title: 'Ingredients / Ingredient Card List',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const CompendiumCards = () => (
  <IngredientCardList label="Compendium">
    {ENTRIES.map((e) => (
      <IngredientCard
        key={e.slug}
        href={route(`/compendium/ingredients/${e.slug}`)}
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
        href={route(`/coven/test-coven/ingredients/${e.slug}`)}
        label={e.label}
        formalName={e.formalName}
        nomenclature={e.nomenclature}
        categories={e.categories}
        variants={e.variants}
        toxic={e.toxic}
        safetyNotes={e.safetyNotes}
        kind={e.kind}
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

export const Default: Story = { render: () => <CompendiumCards /> };
export const CupboardGrid: Story = { render: () => <CupboardCards /> };
export const CupboardGridCompact: Story = { render: () => <CupboardCards density="compact" /> };
