import 'server-only';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import type { WorkingView } from '@/components/SpellWorkings/types';
import { allPages } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { listWorkingsPage } from '@/modules/grimoire';
import { displayNamesOf } from '@/modules/identity';
import { formLabel } from '@/modules/ingredients/validation/form-label';

// A spell's workings as the recipe page's Workings section draws them. Read through the
// connection finder as the signed-in session, which keeps a private working to its recorder and the
// people named on it in SQL; per request, never cached (rule 6).

/** What a participant reads when no name is readable for them. */
export const FORMER_MEMBER = 'A former member';

export async function readWorkingsOf(
  session: Session,
  workspaceId: string,
  spellId: string,
  steps: readonly RecipeStep[],
  /** The viewer's role may delete workings; deleting is still the recorder's alone. */
  mayDelete: boolean,
): Promise<WorkingView[]> {
  const reports = await allPages((request) =>
    listWorkingsPage(session, workspaceId, spellId, request),
  );
  const recorders = await displayNamesOf(
    session,
    reports.map(({ working }) => working.createdBy),
  );
  const stepAt = new Map(steps.map((step, i) => [step.id, { step, position: i + 1 }]));
  return reports.map(({ working, participants, deductions }, i) => ({
    id: working.id,
    status: working.status,
    visibility: working.visibility,
    workedOn: working.workedOn,
    note: working.note,
    recordedBy: recorders[i] ?? null,
    participants: participants.map((person) => person.displayName ?? FORMER_MEMBER),
    deductions: deductions.flatMap((line) => {
      const at = stepAt.get(line.spellStepId);
      if (!at || at.step.kind !== 'ingredient') return [];
      const { name, form } = at.step;
      return [
        {
          id: line.id,
          position: at.position,
          name: form ? `${name} (${formLabel(form)})` : name,
          quantity: String(Number(line.quantity)),
          unit: line.unit,
        },
      ];
    }),
    canChange: mayDelete && working.createdBy === session.userId,
  }));
}
