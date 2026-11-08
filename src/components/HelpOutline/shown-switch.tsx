'use client';

import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import ShownSwitch from '../ShownSwitch';

export const SetHelpArticleShownDocument = graphql(`
  mutation SetHelpArticleShown($id: ID!, $shown: Boolean!) {
    setHelpArticleShown(id: $id, shown: $shown) {
      id
    }
  }
`);

/** The shown switch for a help row, saving each press; `onChange` makes it a form field instead. */
export default function HelpShownSwitch({
  id,
  title,
  shown,
  label,
  onChange,
}: {
  /** Left out (a row not yet saved), the switch only reports the press. */
  id?: string;
  title: string;
  shown: boolean;
  label?: string;
  onChange?: (next: boolean) => void;
}): ReactElement {
  return (
    <ShownSwitch
      shown={shown}
      onChange={onChange}
      save={
        id === undefined
          ? undefined
          : async (next) => {
              await graphqlRequest(SetHelpArticleShownDocument, { id, shown: next });
            }
      }
      tip={(on) => (on ? 'Shown to Readers' : 'Hidden from Readers')}
      announcement={(on) => (on ? 'Shown to readers.' : 'Hidden from readers.')}
      label={label}
      accessibleName={`Shown to Readers: ${title}`}
    />
  );
}
