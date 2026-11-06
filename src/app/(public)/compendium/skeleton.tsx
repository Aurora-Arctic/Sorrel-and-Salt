import FilterForm from '@/components/FilterForm';
import IngredientCardList from '@/components/IngredientCardList';
import { IngredientCardSkeleton } from '@/components/IngredientCard/skeleton';
import ListFrame from '@/components/ListFrame';
import PageColumn from '@/components/PageColumn';
import PageHeader from '@/components/PageHeader';
import { PUBLIC_COMPENDIUM_PATH } from '@/components/CompendiumList/href';

// The compendium's own head, filter row and card grid, with the filter's controls disabled and the cards empty.
export const CompendiumSkeleton = () => (
  <PageColumn as="div">
    <PageHeader
      eyebrow="Reference"
      title="Compendium"
      lede="Ingredients for spellwork: their formal and folk names, categories, deities and forms, with the sources behind them."
    />
    <ListFrame disabled>
      <FilterForm
        label="Filter Compendium"
        action={PUBLIC_COMPENDIUM_PATH}
        searchHref={() => PUBLIC_COMPENDIUM_PATH}
        shown={[]}
      >
        <input name="q" type="search" aria-label="Search" />
      </FilterForm>
      <IngredientCardList label="Compendium">
        {Array.from({ length: 6 }, (_, at) => (
          <IngredientCardSkeleton key={at} />
        ))}
      </IngredientCardList>
    </ListFrame>
  </PageColumn>
);
