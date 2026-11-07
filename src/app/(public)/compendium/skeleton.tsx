import { CompendiumFilterSkeleton } from '@/components/CompendiumList/skeleton';
import { SearchListSkeleton } from '@/components/IngredientSearch/skeleton';
import { ListBodySkeleton } from '@/components/ListFrame/skeleton';
import PageColumn from '@/components/PageColumn';
import PageHeader from '@/components/PageHeader';

// The compendium's own head, filter row and card grid, with the filter's controls disabled and the cards empty.
export const CompendiumSkeleton = () => (
  <PageColumn as="div">
    <PageHeader
      eyebrow="Reference"
      title="Compendium"
      lede="Ingredients for spellwork: their formal and folk names, categories, deities and forms, with the sources behind them."
    />
    <SearchListSkeleton row={<CompendiumFilterSkeleton />}>
      <ListBodySkeleton label="Compendium" card="compendium" />
    </SearchListSkeleton>
  </PageColumn>
);
