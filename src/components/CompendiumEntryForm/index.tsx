'use client';

import type { ReactElement } from 'react';
import IngredientForm from '../IngredientForm';
import SourcingScore from '../SourcingScore';
import type { CompendiumEntryFormProps } from './types';

// The compendium's ingredient form as both of its edit dialogs draw it, so the admin list's and the
// entry page's are one thing; each passes its own navigation, as each has its own addresses.
export default function CompendiumEntryForm({
  sourcing,
  ...fields
}: CompendiumEntryFormProps): ReactElement {
  return (
    <IngredientForm
      {...fields}
      workspaceId={null}
      mayPromote
      sourcesIntro={sourcing && <SourcingScore sourcing={sourcing} />}
    />
  );
}
