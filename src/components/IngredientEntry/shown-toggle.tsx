'use client';

import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import ShownSwitch from '../ShownSwitch';
import type { ShownToggleProps } from './types';

export const SetCompendiumEntryShownDocument = graphql(`
  mutation SetCompendiumEntryShown($id: ID!, $shown: Boolean!) {
    setCompendiumEntryShown(id: $id, shown: $shown) {
      id
    }
  }
`);

/** The shown switch for a compendium entry: saves to the entry, or reports the press when `onChange` is given. */
export default function ShownToggle({
  ingredientId,
  shown,
  onChange,
  name,
  label,
  accessibleName,
}: ShownToggleProps): ReactElement {
  return (
    <ShownSwitch
      shown={shown}
      onChange={onChange}
      save={
        ingredientId === undefined
          ? undefined
          : async (next) => {
              await graphqlRequest(SetCompendiumEntryShownDocument, {
                id: ingredientId,
                shown: next,
              });
            }
      }
      tip={(on) => (on ? 'Shown in the Compendium' : 'Hidden in the Compendium')}
      announcement={(on) =>
        on ? 'Shown in the public compendium.' : 'Hidden from the public compendium.'
      }
      label={label}
      accessibleName={accessibleName ?? `Shown in Compendium: ${name}`}
    />
  );
}
