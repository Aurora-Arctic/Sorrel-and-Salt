import type { Route } from 'next';
import { detailsHeading, detailsMarks } from '../../../../../components/IngredientEntry/details';
import IngredientSummary from '../../../../../components/IngredientEntry/summary';
import type { IngredientDetailsOpened } from '../../../../../components/IngredientEntry/types';
import type { readViewedEntry } from './reads';
import { stockDialogOf } from '@/app/coven-stock';

// What the details Quick Look shows of an entry `readViewedEntry` read, without the controls:
// its head, its marks, its last edit, the link to its page, and the summary with the coven's
// jars (M9.9). The coven's Ingredients page adds the card's actions to it; a spell's recipe
// page and the grimoire's Quick Look open it over the spell as it is (the owner, 2026-10-28).

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
    // The coven's jars of it, to every role: each form shows its stock (M9.9).
    children: (
      <IngredientSummary
        detail={viewed.detail}
        covens={viewed.covens}
        jars={stockDialogOf(variants, viewed.jars).jars}
      />
    ),
  };
}
