import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { SpellBuilderInput, SpellBuilderSpell } from './types';

// The spell builder's save: the one call every way of saving goes
// through, the autosave's, Save's, Close's and Mark Complete's. It takes a
// target rather than assuming "the row", so that a later edit to a complete
// spell can go into a draft revision (spell history, v2) by naming another
// target. Today both targets are the spell's one row, draft or complete.
// Beside it, the read Reload Latest makes after a stale write: the
// spell as the server has it now, fields, categories and steps, which the
// builder puts in the form in place of what was typed.
// claude-docs/components/spell-builder.md, "Saving" and "Two people, one spell".

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

/**
 * The spell as the server has it now, read for Reload Latest. The step's
 * selection is written out once more here rather than shared (./steps/documents.ts
 * says why): `SpellBuilderSpell` types the answer where it is read.
 */
const SpellBuilderReloadDocument = graphql(`
  query SpellBuilderReload($workspaceId: ID!, $id: ID!) {
    spell(workspaceId: $workspaceId, id: $id) {
      id
      revision
      title
      intent
      jarDescription
      sealWaxColor
      moonPhase
      dayOfWeek
      note
      categories {
        id
      }
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
 * writes over whatever the row is at; the builder never sends one, since Keep
 * My Version names the revision the refusal reported, so a third
 * save in between is met as a conflict too rather than written over.
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

/**
 * Reads the spell as the server has it now, for Reload Latest: the
 * fields, the categories as the ids the form picks, and the whole recipe.
 */
export async function readLatestSpell(workspaceId: string, id: string): Promise<SpellBuilderSpell> {
  const { spell } = await graphqlRequest(SpellBuilderReloadDocument, { workspaceId, id });
  const { categories, ...rest } = spell;
  return { ...rest, categoryIds: categories.map((category) => category.id) };
}
