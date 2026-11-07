import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import IngredientCard from '../IngredientCard';
import { categoryRefs } from '../IngredientCard/category-refs';
import { CardCategoryVocabulary } from '../IngredientCard/category-vocabulary';
import { CATEGORY_VOCABULARY, ENTRIES, jarLinesOf } from './story-fixtures';
import IngredientCardList from '.';
import { route } from '../../../.storybook/route';

const meta = {
  title: 'Ingredients / Ingredient Card List',
  decorators: [
    (Story) => (
      <CardCategoryVocabulary categories={CATEGORY_VOCABULARY}>
        <Story />
      </CardCategoryVocabulary>
    ),
  ],
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
        categories={categoryRefs(e.categories)}
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
        categories={categoryRefs(e.categories)}
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
