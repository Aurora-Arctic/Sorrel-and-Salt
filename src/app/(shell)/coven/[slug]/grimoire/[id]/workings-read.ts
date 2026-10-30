import 'server-only';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import type { WorkingView } from '@/components/SpellWorkings/types';
import { allPages } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import type { NotDeductedReason } from '@/gql/graphql';
import { skipLine } from '@/components/RecordWorking/warnings';
import { listWorkingsPage, previewWorkingDeductions } from '@/modules/grimoire';
import { displayNamesOf } from '@/modules/identity';
import { formLabel } from '@/modules/ingredients/validation/form-label';

// A spell's workings as the recipe page's Workings section draws them. Read through the
// connection finder as the signed-in session, which keeps a private working to its recorder and the
// people named on it in SQL; per request, never cached (rule 6).

type ServiceReason = Awaited<
  ReturnType<typeof previewWorkingDeductions>
>['warnings'][number]['reason'];

/** The service's reasons under the names the dialog's wording is keyed by. */
const REASON: Record<ServiceReason, NotDeductedReason> = {
  custom: 'CUSTOM',
  unstocked: 'UNSTOCKED',
  'no-quantity': 'NO_QUANTITY',
  'units-differ': 'UNITS_DIFFER',
  'jar-not-measured': 'JAR_NOT_MEASURED',
};

/** What a participant reads when no name is readable for them. */
export const FORMER_MEMBER = 'A former member';

export async function readWorkingsOf(
  session: Session,
  workspaceId: string,
  spellId: string,
  steps: readonly RecipeStep[],
  /** The viewer's role may delete workings; deleting is still the recorder's alone. */
  mayDelete: boolean,
  /** The viewer's role may change workings; changing is still the recorder's alone. */
  mayEdit: boolean,
): Promise<WorkingView[]> {
  const reports = await allPages((request) =>
    listWorkingsPage(session, workspaceId, spellId, request),
  );
  const recorders = await displayNamesOf(
    session,
    reports.map(({ working }) => working.createdBy),
  );
  // What completing would skip is the spell's, not each draft's, so it is read once, and only when a draft of the viewer's is there to complete.
  const completable = reports.some(
    ({ working }) => working.status === 'draft' && working.createdBy === session.userId,
  );
  const skips = completable
    ? (await previewWorkingDeductions(session, workspaceId, spellId)).warnings.map((warning) =>
        skipLine(warning.stepName, REASON[warning.reason]),
      )
    : [];
  const stepAt = new Map(steps.map((step, i) => [step.id, { step, position: i + 1 }]));
  return reports.map(({ working, participants, deductions }, i) => ({
    id: working.id,
    status: working.status,
    visibility: working.visibility,
    workedOn: working.workedOn,
    note: working.note,
    recordedBy: recorders[i] ?? null,
    // The recorder is named once, in "Recorded by", so the people who took part leave them out.
    warnings: working.status === 'draft' && working.createdBy === session.userId ? skips : [],
    participants: participants
      .filter((person) => person.userId !== working.createdBy)
      .map((person) => person.displayName ?? person.name ?? FORMER_MEMBER),
    // The spell's order, so the lines read the way the recipe does without carrying its numbers.
    deductions: [...deductions]
      .sort(
        (a, b) =>
          (stepAt.get(a.spellStepId)?.position ?? 0) - (stepAt.get(b.spellStepId)?.position ?? 0),
      )
      .flatMap((line) => {
        const at = stepAt.get(line.spellStepId);
        if (!at || at.step.kind !== 'ingredient') return [];
        const { name, form } = at.step;
        return [
          {
            id: line.id,
            name: form ? `${name} (${formLabel(form)})` : name,
            quantity: String(Number(line.quantity)),
            unit: line.unit,
          },
        ];
      }),
    canChange: mayDelete && working.createdBy === session.userId,
    editable:
      mayEdit && working.createdBy === session.userId
        ? {
            id: working.id,
            workedOn: working.workedOn,
            note: working.note,
            visibility: working.visibility,
            status: working.status,
            participants: participants.map((person) => ({
              userId: person.userId,
              name: person.displayName ?? person.name ?? FORMER_MEMBER,
            })),
          }
        : undefined,
  }));
}
