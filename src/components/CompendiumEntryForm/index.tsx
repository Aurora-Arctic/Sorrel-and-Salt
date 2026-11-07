'use client';

import type { ReactElement } from 'react';
import IngredientForm from '../IngredientForm';
import SourcingScore from '../SourcingScore';
import type { CompendiumEntryFormProps } from './types';

// Shared by the admin list's and the entry page's edit dialogs; each passes its own navigation.
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
