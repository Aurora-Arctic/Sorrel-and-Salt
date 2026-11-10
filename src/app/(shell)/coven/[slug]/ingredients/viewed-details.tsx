import type { Route } from 'next';
import { detailsHeading, detailsMarks } from '../../../../../components/IngredientEntry/details';
import IngredientSummary from '../../../../../components/IngredientEntry/summary';
import type { IngredientDetailsOpened } from '../../../../../components/IngredientEntry/types';
import type { readViewedEntry } from './reads';
import { stockDialogOf } from '@/app/coven-stock';

export function viewedDetailsOf(
  viewed: NonNullable<Awaited<ReturnType<typeof readViewedEntry>>>,
  covenSlug: string,
): Pick<IngredientDetailsOpened, 'heading' | 'marks' | 'lastEdit' | 'pageHref' | 'children'> {
  const variants = viewed.detail.variants.map(({ variant }) => variant);
  return {
    heading: detailsHeading(viewed.shown),
    marks: detailsMarks(viewed.detail, true),
    lastEdit: viewed.lastEdit,
    pageHref: `/coven/${covenSlug}/ingredients/${viewed.shown.id}` as Route,
    children: (
      <IngredientSummary
        detail={viewed.detail}
        covens={viewed.covens}
        jars={stockDialogOf(variants, viewed.jars).jars}
      />
    ),
  };
}
