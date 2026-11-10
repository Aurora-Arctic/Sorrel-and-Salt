import { CompendiumFilterSkeleton } from '@/components/CompendiumList/skeleton';
import { COMPENDIUM_EYEBROW, COMPENDIUM_LEDE, COMPENDIUM_TITLE } from './head';
import { SearchListSkeleton } from '@/components/IngredientSearch/skeleton';
import { ListBodySkeleton } from '@/components/ListFrame/skeleton';
import PageColumn from '@/components/PageColumn';
import PageHeader from '@/components/PageHeader';

// The compendium's own head, filter row and card grid, with the filter's controls disabled and the cards empty.
export const CompendiumSkeleton = () => (
  <PageColumn as="div">
    <PageHeader eyebrow={COMPENDIUM_EYEBROW} title={COMPENDIUM_TITLE} lede={COMPENDIUM_LEDE} />
    <SearchListSkeleton row={<CompendiumFilterSkeleton />}>
      <ListBodySkeleton label="Compendium" card="compendium" />
    </SearchListSkeleton>
  </PageColumn>
);
