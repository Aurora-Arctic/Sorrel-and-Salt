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
 * How many covens hold the compendium entry, said inside the curator's delete
 * question (M12.25): a count, never a coven's name. Mounted only while the
 * question is asked, so the read goes out when it opens, and it says nothing
 * until the number has arrived, so a count of none is never guessed. It is
 * not kept after the question closes: the next one asks again. A failed read
 * leaves the question unadorned, since the delete itself needs no count.
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
