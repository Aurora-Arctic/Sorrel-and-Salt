import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { SpellBuilderInput, SpellBuilderSpell } from './types';

// The spell builder's save (M13.17): the one call every way of saving goes
// through, the autosave's, Save's, Close's and Mark Complete's. It takes a
// target rather than assuming "the row", so that a later edit to a complete
// spell can go into a draft revision (spell history, v2) by naming another
// target. Today both targets are the spell's one row, draft or complete.
// claude-docs/components/spell-builder.md, "Saving".

const CreateSpellDocument = graphql(`
  mutation CreateSpell($workspaceId: ID!, $input: SpellInput!) {
    createSpell(workspaceId: $workspaceId, input: $input) {
      id
      revision
      title
      intent
      jarDescription
      sealWaxColor
      moonPhase
      dayOfWeek
      note
      steps {
        id
        name
        form
        quantity
        unit
        body
        ingredient {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          stock(workspaceId: $workspaceId) {
            unit
            quantityOnHand
            lowStockThreshold
            variant {
              id
            }
          }
        }
        variant {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          formChoice {
            group {
              icon
            }
          }
        }
      }
      visibility
      status
    }
  }
`);

const UpdateSpellDocument = graphql(`
  mutation UpdateSpell($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {
    updateSpell(workspaceId: $workspaceId, id: $id, input: $input) {
      id
      revision
      title
      intent
      jarDescription
      sealWaxColor
      moonPhase
      dayOfWeek
      note
      steps {
        id
        name
        form
        quantity
        unit
        body
        ingredient {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          stock(workspaceId: $workspaceId) {
            unit
            quantityOnHand
            lowStockThreshold
            variant {
              id
            }
          }
        }
        variant {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          formChoice {
            group {
              icon
            }
          }
        }
      }
      visibility
      status
    }
  }
`);

/** Where a save goes: a spell not made yet, or the saved spell at the revision last read. */
export type SpellSaveTarget =
  { kind: 'new' } | { kind: 'spell'; id: string; revision: number | null };

/**
 * Saves `input` to `target`: `createSpell` for a new spell, otherwise
 * `updateSpell` against the revision the target names. A `null` revision
 * writes over whatever the row is at (Keep My Version, M13.18).
 */
export async function saveSpell(
  workspaceId: string,
  target: SpellSaveTarget,
  input: SpellBuilderInput,
): Promise<SpellBuilderSpell> {
  if (target.kind === 'new') {
    const { createSpell } = await graphqlRequest(CreateSpellDocument, { workspaceId, input });
    return createSpell;
  }
  const { updateSpell } = await graphqlRequest(UpdateSpellDocument, {
    workspaceId,
    id: target.id,
    input: { ...input, expectedRevision: target.revision },
  });
  return updateSpell;
}
