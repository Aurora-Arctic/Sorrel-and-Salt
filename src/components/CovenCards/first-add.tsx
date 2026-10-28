'use client';

import type { ReactElement } from 'react';
import { openHref } from '../AppShell/add-href';

// The empty cupboard's Add Ingredient (M9.11). It opens the shell's own dialog (M8.16) by the
// address that dialog reads, `?new=ingredient-coven-<slug>`, written with the browser's `pushState` as the bar's
// button writes it, rather than drawing a second dialog: one form, one save path, and Back
// closes it the same way. The slug is always named, so the dialog is this coven's even when
// the bar's default is another.

const FirstAdd = ({ covenSlug }: { covenSlug: string }): ReactElement => (
  <button
    type="button"
    className="btn btn--solid"
    onClick={() =>
      window.history.pushState(
        null,
        '',
        openHref(window.location.pathname, new URLSearchParams(window.location.search), covenSlug),
      )
    }
  >
    Add Ingredient
  </button>
);

export default FirstAdd;
