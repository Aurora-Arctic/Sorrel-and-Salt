import type { Route } from 'next';
import { dialogParams, listHref } from '../../lib/list-href';
import type { ListDialog } from '../../lib/types';
import type { CompendiumPlace } from './types';

// The address of `/admin/compendium` under a filter, at a page, with a modal
// open over it or not: the list's links, the pager, the filter's submit and
// the modal's way back all build it. A typed wrapper on `listHref`, which
// writes a blank filter as none and `new` as a bare flag; the form is its
// text, `form=Oil`, and No Refs is `withoutReferences=1`, the
// value its checkbox submits natively.

const PATH = '/admin/compendium';

export function compendiumHref(place: CompendiumPlace, dialog?: ListDialog): Route {
  return listHref(PATH, {
    query: place.query,
    form: place.form,
    nomenclature: place.nomenclature,
    withoutReferences: place.withoutReferences ? '1' : undefined,
    after: place.after,
    before: place.before,
    ...dialogParams(dialog),
  });
}
