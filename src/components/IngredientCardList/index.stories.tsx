import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import IngredientCard from '../IngredientCard';
import { ENTRIES, jarLinesOf } from './story-fixtures';
import IngredientCardList from '.';
import { route } from '../../../.storybook/route';

// Render-only; wrapping and density are asserted in tests/components/IngredientCardList.
// The same nine entries for the public compendium (no marks, jars or actions) and
// the coven's Ingredients page. The preview ignores `meta.width`; set the viewport.
const meta = {
  title: 'Ingredients / Ingredient Card List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

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
            <button type="button" className="btn btn--destructive btn--small">
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

const defaultNode = <CompendiumCards />;
const cupboardGridNode = <CupboardCards />;
const cupboardGridCompactNode = <CupboardCards density="compact" />;

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Cupboard Grid': cupboardGridNode,
  'Cupboard Grid Compact': cupboardGridCompactNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
