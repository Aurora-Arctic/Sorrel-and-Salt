'use client';

import type { ReactElement } from 'react';
import { preloadOnIntent, usePreloadWhenIdle } from '../../lib/use-lazy-module';
import { sortableModule } from '../Combobox/lazy-sortable';
import { AnnotateLink, EditLink } from '../IconTip';
import type { EditLinkProps } from '../IconTip/types';

// Edit and Annotate open dialogs holding ordered lists, so these start the sortable list loading once the
// page is idle and as a person reaches for either (claude-docs/components/coven-cards.md, "Contracts").

type Props = EditLinkProps & { className?: string };

export function CardEditLink(props: Props): ReactElement {
  usePreloadWhenIdle(sortableModule);
  return <EditLink {...props} preload={preloadOnIntent(sortableModule)} />;
}

export function CardAnnotateLink(props: Props): ReactElement {
  usePreloadWhenIdle(sortableModule);
  return <AnnotateLink {...props} preload={preloadOnIntent(sortableModule)} />;
}
