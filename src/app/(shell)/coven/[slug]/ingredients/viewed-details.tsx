import type { Route } from 'next';
import { detailsHeading, detailsMarks } from '../../../../../components/IngredientEntry/details';
import IngredientSummary from '../../../../../components/IngredientEntry/summary';
import type { IngredientDetailsOpened } from '../../../../../components/IngredientEntry/types';
import type { readViewedEntry } from './reads';
import { stockDialogOf } from '@/app/coven-stock';

// What the details Quick Look shows of an entry `readViewedEntry` read, without the controls: its
// head, marks, last edit, the link to its page, and the summary with the coven's jars. The coven's
// Ingredients page adds the card's actions; a spell's recipe page and Quick Look open it as it is.

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
    // The coven's jars of it, to every role: each form shows its stock.
    children: (
      <IngredientSummary
        detail={viewed.detail}
        covens={viewed.covens}
        jars={stockDialogOf(variants, viewed.jars).jars}
      />
    ),
  };
}
