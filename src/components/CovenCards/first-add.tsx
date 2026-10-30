'use client';

import type { ReactElement } from 'react';
import { openHref } from '../AppShell/add-href';

// The empty cupboard's Add Ingredient. It opens the shell's dialog at `?new=ingredient-coven-<slug>`
// by `pushState`, as the bar's button does; the slug is always named, so the dialog is this coven's
// even when the bar's default is another.

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
