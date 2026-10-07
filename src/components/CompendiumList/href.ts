import type { Route } from 'next';
import type { CompendiumDialog, CompendiumPlace } from './types';

// The address of `/admin/compendium` under a filter, at a page, with a modal
// open over it or not: the list's links, the pager, the filter's submit and
// the modal's way back all build it, as `categoriesHref` does for the
// categories. A blank filter is written as none, and Without References as
// `withoutReferences=1`, the value its checkbox submits natively. `new` is a
// bare flag, read by its presence.

const PATH = '/admin/compendium';

export function compendiumHref(place: CompendiumPlace, dialog?: CompendiumDialog): Route {
  const pair = (name: string, value: string) => new URLSearchParams({ [name]: value }).toString();
  const parts = [
    ...(place.query ? [pair('query', place.query)] : []),
    ...(place.nomenclature ? [pair('nomenclature', place.nomenclature)] : []),
    ...(place.withoutReferences ? ['withoutReferences=1'] : []),
    ...(place.after ? [pair('after', place.after)] : []),
    ...(place.before ? [pair('before', place.before)] : []),
    ...(dialog === 'new' ? ['new'] : dialog ? [pair('edit', dialog.edit)] : []),
  ];
  return (parts.length ? `${PATH}?${parts.join('&')}` : PATH) as Route;
}
