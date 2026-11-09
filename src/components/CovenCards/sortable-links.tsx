'use client';

import type { ReactElement } from 'react';
import { preloadOnIntent, usePreloadWhenIdle } from '../../lib/use-lazy-module';
import { sortableModule } from '../Combobox/lazy-sortable';
import {
  compendiumEntryFormModule,
  cupboardEntryFormModule,
  ingredientFormModule,
} from '../IngredientEntry/lazy-forms';
import { AnnotateLink, EditLink } from '../IconTip';
import type { EditLinkProps } from '../IconTip/types';

// Edit and Annotate open dialogs holding ordered lists, so these start the sortable list loading once the
// page is idle and as a person reaches for either (claude-docs/components/coven-cards.md, "Contracts").

// What each opens: the sortable list and its form (a compendium entry's form beside the coven's, as either may open).
const EDIT = [sortableModule, ingredientFormModule, compendiumEntryFormModule];
const ANNOTATE = [sortableModule, cupboardEntryFormModule];

type Props = EditLinkProps & { className?: string };

export function CardEditLink(props: Props): ReactElement {
  usePreloadWhenIdle(...EDIT);
  return <EditLink {...props} preload={preloadOnIntent(...EDIT)} />;
}

export function CardAnnotateLink(props: Props): ReactElement {
  usePreloadWhenIdle(...ANNOTATE);
  return <AnnotateLink {...props} preload={preloadOnIntent(...ANNOTATE)} />;
}
