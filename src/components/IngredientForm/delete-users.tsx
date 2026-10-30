'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlQuery } from '../../lib/graphql-client';

const CompendiumEntryUsersDocument = graphql(`
  query CompendiumEntryUsers($id: ID!) {
    compendiumEntryUsers(id: $id)
  }
`);

/**
 * How many covens hold the compendium entry, said inside the curator's delete question: a count,
 * never a coven's name. Mounted only while the question is asked and read afresh each time, it says
 * nothing until the number arrives, so none is never guessed; a failed read leaves it bare.
 */
export function DeleteUsers({ id }: { id: string }): ReactElement | null {
  const { data } = useQuery({
    ...graphqlQuery(CompendiumEntryUsersDocument, { id }),
    gcTime: 0,
    throwOnError: false,
  });
  if (data === undefined) return null;
  return (
    // The paragraph keeps the text styling and block box a bare <output> would lose.
    <p>
      <output>
        {data.compendiumEntryUsers === 1
          ? 'Used by 1 coven.'
          : `Used by ${data.compendiumEntryUsers} covens.`}
      </output>
    </p>
  );
}
