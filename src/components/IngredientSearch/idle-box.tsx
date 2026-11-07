'use client';

import { type ReactElement, useId } from 'react';
import Combobox from '../Combobox';
import { MagnifierIcon } from '../Field/icons';
import { WORDING } from './search-box';
import type { IngredientSearchFormProps } from './types';

/** The search box as the real one first draws it, with no query hook and nothing to ask: for a list on its way. */
const IngredientSearchIdleBox = ({
  source,
}: {
  source?: IngredientSearchFormProps['source'];
}): ReactElement => {
  const wording = source?.kind === 'grimoire' ? WORDING.spell : WORDING.ingredient;
  const controlId = useId();
  return (
    <Combobox
      id={controlId}
      label={wording.label}
      name="query"
      value=""
      onChange={() => undefined}
      onPick={() => undefined}
      suggestions={{ options: [], pending: false }}
      offerTyped={false}
      noun="result"
      placeholder={wording.placeholder}
      clear={{ label: wording.clear, onClear: () => undefined, empty: true }}
      toggle={false}
      leading={
        <button type="submit" className="combobox__indicator">
          <MagnifierIcon />
          <span className="visually-hidden">Search</span>
        </button>
      }
    />
  );
};

export default IngredientSearchIdleBox;
