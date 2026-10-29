import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { SpellBuilderInput, SpellBuilderSpell } from './types';

// The builder's one save call, used by autosave, Save, Close and Mark Complete, and the read Reload Latest makes after a stale write
// (claude-docs/components/spell-builder.md, "Saving", "Two people, one spell" and "Notes from code comments: the save module").

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
 * Saves `input` to `target`: `createSpell` for a new spell, else `updateSpell` against the target's revision; a `null` revision overwrites
 * (claude-docs/components/spell-builder.md, "Notes from code comments: the save call").
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
