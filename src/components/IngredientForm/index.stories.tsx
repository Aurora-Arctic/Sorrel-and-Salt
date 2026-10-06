import type { Story } from '@ladle/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PossibleDuplicatesQuery } from '../../gql/graphql';
import IngredientForm from '.';
import { DUPLICATE_ROWS } from './duplicates';

// Render-only; behaviour is asserted in tests/components/IngredientForm. The
// workshop has no API, so a lookup asks and finds nothing, and a save fails
// into the alert above the fields; Save with an empty name shows the
// resolver's errors. Both states are worth seeing. The TanStack Query client
// comes from the workshop's global provider (.ladle/components.tsx), as it
// does from the app's root layout.
export default {
  title: 'Forms / Ingredient',
};

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000000';

// Unframed: the form takes its width from whatever holds it.
export const Blank: Story = () => <IngredientForm workspaceId={WORKSPACE_ID} />;

const CATS_CLAW: PossibleDuplicatesQuery = {
  possibleDuplicates: {
    edges: [
      { node: { id: 'claw-1', name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' } },
      { node: { id: 'claw-2', name: "Cat's Claw", canonicalName: 'Felis catus' } },
      { node: { id: 'claw-3', name: "Cat's Claw", canonicalName: null } },
    ],
  },
};

/**
 * Type "Cat's Claw" into Name: its lookup is answered from the workshop's
 * cache, filled ahead under the key the query uses and never asked again. The
 * one client, not a second: a nested provider would split the cache.
 */
export const DuplicateWarning: Story = () => {
  const client = useQueryClient();
  useState(() => {
    client.setQueryDefaults(['PossibleDuplicates'], { staleTime: Infinity, gcTime: Infinity });
    client.setQueryData(
      [
        'PossibleDuplicates',
        { workspaceId: WORKSPACE_ID, name: "Cat's Claw", first: DUPLICATE_ROWS },
      ],
      CATS_CLAW,
    );
  });
  return <IngredientForm workspaceId={WORKSPACE_ID} />;
};
