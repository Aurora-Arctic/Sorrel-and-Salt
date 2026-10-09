import type { Route } from 'next';
import { VOCABULARY_COPY } from './vocabularies';
import type { FlatVocabulary, VocabularyDialog, VocabularyPlace } from './types';

// The address of a flat vocabulary's admin page under a query, at a page,
// with a modal open over it or not, as `groupedValuesHref` builds
// `/admin/forms`': the list's links, the pager, the filter's submit and the
// modal's way back all build it. The page's own query and cursor stay, so
// closing the modal lands where it was opened. A blank query is written as
// none; `new` is a bare flag, read by its presence.

export function vocabularyHref(
  vocabulary: FlatVocabulary,
  place: VocabularyPlace,
  dialog?: VocabularyDialog,
): Route {
  const path = VOCABULARY_COPY[vocabulary].path;
  const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();
  const parts = [
    ...(['query', 'after', 'before'] as const).flatMap((name) => {
      const value = place[name];
      return value ? [pair(name, value)] : [];
    }),
    ...(dialog === 'new' ? ['new'] : dialog ? [pair('edit', dialog.edit)] : []),
  ];
  return (parts.length ? `${path}?${parts.join('&')}` : path) as Route;
}
