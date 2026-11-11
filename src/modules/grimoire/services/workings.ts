import 'server-only';
import {
  findDeductionsOfWorkings,
  findMembershipsOfUsers,
  findOneSpell,
  findOneWorking,
  findParticipantsOfWorkings,
  findStockOfVariants,
  findCompleteWorkingCounts,
  findWorkingsInSpell,
  findWorkingsPage,
  isParticipantOfWorking,
  withAudit,
} from '../../../db/repository';
import { NO_SUCH_SPELL } from './spell-not-found';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { PageEntry, PageRequest } from '../../../lib/types';
import type { Session } from '../../../lib/session';
import { QUANTITY_SCALE } from '../../ingredients/schema/quantities';
import { isRowId, parseInput } from '../../../lib/validation';
import { assertMembership, type Membership } from '@/modules/coven';
import { displayNamesOf } from '@/modules/identity';
import { planDeductions, type PlanStep, type StepPlan } from '../plan-deductions';
import { spellWorkingDeductions } from '../schema/spell-working-deductions';
import { spellWorkings } from '../schema/spell-workings';
import { WorkingInput } from '../validation/working';
import { perCoven } from './spell-reads';
import { stepsInSpells } from './step-views';
import { assertWidens } from './visibility-rule';
import type {
  PlannedDeduction,
  SpellKey,
  SpellRow,
  SpellStepView,
  WorkingParticipantView,
  WorkingDeductionPreview,
  WorkingReport,
  WorkingRow,
  WorkingWarning,
} from '../types';

// Read under its own visibility, capped at its spell's; changed by its recorder or a member named on it, deleted by its recorder alone.
// A hidden working is `NotFound`, never confirmed to exist (claude-docs/db/grimoire.md, "Workings").

const NO_SUCH_WORKING = 'No such working in this coven';

async function readableWorking(membership: Membership, workingId: string): Promise<WorkingRow> {
  if (!isRowId(workingId)) throw new NotFound(NO_SUCH_WORKING);
  const working = await findOneWorking(membership, workingId);
  if (!working) throw new NotFound(NO_SUCH_WORKING);
  return working;
}

/** The working can only be read through its spell, so a missing one is the same `NotFound`. */
async function spellOf(membership: Membership, working: WorkingRow): Promise<SpellRow> {
  const spell = await findOneSpell(membership, working.spellId);
  if (!spell) throw new NotFound(NO_SUCH_WORKING);
  return spell;
}

/** A member who can read it, as a participant or in the coven, still cannot delete it. */
function assertRecorder(membership: Membership, working: WorkingRow): void {
  if (working.createdBy !== membership.userId) {
    throw new Forbidden('Only the person who recorded a working can delete it');
  }
}

/** The role check has already refused an observer. */
async function assertMayChange(membership: Membership, working: WorkingRow): Promise<void> {
  if (working.createdBy === membership.userId) return;
  if (await isParticipantOfWorking(membership, working.id)) return;
  throw new Forbidden(
    'Only the person who recorded a working, or someone named on it, can change it',
  );
}

// The latest calendar day anywhere is today at UTC+14, so a browser's own today is never refused.
function latestToday(): string {
  return new Date(Date.now() + 14 * 3_600_000).toISOString().slice(0, 10);
}

function assertDayHasCome(workedOn: string): void {
  if (workedOn > latestToday()) throw new Forbidden("A working can't be completed before its day.");
}

function assertSpellComplete(spell: SpellRow, doing: string): void {
  const { status } = spell;
  if (status !== 'complete') {
    throw new Forbidden(
      `This spell is a draft, so ${doing}. A spell takes workings once the spell is complete.`,
    );
  }
}

/** A check constraint cannot read the parent row, so the service does. */
function assertWithinSpell(spell: SpellRow, visibility: WorkingRow['visibility']): void {
  const { visibility: spellVisibility } = spell;
  if (spellVisibility === 'private' && visibility === 'workspace') {
    throw new Forbidden(
      'This spell is private, so a working of it cannot be shared with the coven. Share the spell first.',
    );
  }
}

async function assertParticipantsAreMembers(
  membership: Membership,
  participants: readonly { userId?: string; name?: string }[],
): Promise<void> {
  const ids = participants.flatMap((participant) =>
    participant.userId === undefined ? [] : [participant.userId],
  );
  if (ids.length === 0) return;
  const seats = await findMembershipsOfUsers(ids);
  const seated = new Set(
    seats.filter((seat) => seat.workspaceId === membership.workspaceId).map((seat) => seat.userId),
  );
  const issues = participants.flatMap((participant, index) =>
    participant.userId !== undefined && !seated.has(participant.userId)
      ? [{ path: ['participants', index], message: 'Choose a member of this coven' }]
      : [],
  );
  if (issues.length > 0) throw new ValidationError(issues);
}

async function planFor(
  membership: Membership,
  spellId: string,
): Promise<{ steps: SpellStepView[]; plan: StepPlan[] }> {
  const steps = (await stepsInSpells(membership, [spellId]))(spellId);
  const variantIds = steps.flatMap((step) => (step.variantId === null ? [] : [step.variantId]));
  const jars = await findStockOfVariants(membership, variantIds);
  const planSteps: PlanStep[] = steps;
  return { steps, plan: planDeductions(planSteps, jars) };
}

/** An instruction-only step is not among them. */
function warningsOf(steps: readonly SpellStepView[], plan: readonly StepPlan[]): WorkingWarning[] {
  const stepOf = new Map(steps.map((step) => [step.id, step]));
  return plan.flatMap((entry) => {
    if (entry.kind !== 'skip') return [];
    const step = stepOf.get(entry.stepId);
    if (!step) return [];
    return [
      {
        stepId: step.id,
        position: step.position,
        stepName: step.name ?? step.ingredient?.name ?? null,
        reason: entry.reason,
      },
    ];
  });
}

async function viewParticipants(
  session: Session,
  membership: Membership,
  workingIds: readonly string[],
): Promise<Map<string, WorkingParticipantView[]>> {
  const rows = await findParticipantsOfWorkings(membership, workingIds);
  const userIds = rows.flatMap((row) => (row.userId === null ? [] : [row.userId]));
  const names = new Map<string, string | null>();
  if (userIds.length > 0) {
    const found = await displayNamesOf(session, userIds);
    userIds.forEach((id, index) => names.set(id, found[index] ?? null));
  }
  const byWorking = new Map<string, WorkingParticipantView[]>();
  for (const row of rows) {
    const view = {
      ...row,
      displayName: row.userId === null ? row.name : (names.get(row.userId) ?? null),
    };
    byWorking.set(row.workingId, [...(byWorking.get(row.workingId) ?? []), view]);
  }
  return byWorking;
}

async function reportOf(
  session: Session,
  membership: Membership,
  working: WorkingRow,
  warnings: WorkingWarning[],
): Promise<WorkingReport> {
  const [participants, deductions] = await Promise.all([
    viewParticipants(session, membership, [working.id]),
    findDeductionsOfWorkings(membership, [working.id]),
  ]);
  return { working, participants: participants.get(working.id) ?? [], deductions, warnings };
}

/**
 * Nothing is taken from the jars until it is completed. The visibility is never wider than the spell's.
 *
 * @throws {Forbidden} the caller may not record workings here; the spell is a draft; or the visibility exceeds the spell's.
 * @throws {NotFound} no such spell here, or none this caller may read.
 * @throws {ValidationError} the input is invalid, or a participant is not a member of this coven.
 */
export async function recordWorking(
  session: Session,
  workspaceId: string,
  spellId: string,
  input: unknown,
): Promise<WorkingReport> {
  const membership = await assertMembership(session, workspaceId, { working: ['create'] });
  if (!isRowId(spellId)) throw new NotFound(NO_SUCH_SPELL);
  const values = parseInput(WorkingInput, input);

  const spell = await findOneSpell(membership, spellId);
  if (!spell) throw new NotFound(NO_SUCH_SPELL);
  assertSpellComplete(spell, 'it takes no new working');
  const visibility = values.visibility ?? spell.visibility;
  assertWithinSpell(spell, visibility);

  const participants = values.participants ?? [{ userId: membership.userId }];
  await assertParticipantsAreMembers(membership, participants);
  const { steps, plan } = await planFor(membership, spellId);

  const working = await withAudit(session, async (write) => {
    const [created] = await write.insert(spellWorkings, {
      spellId,
      workedOn: values.workedOn,
      note: values.note ?? null,
      visibility,
    });
    await write.replaceWorkingParticipants(membership, created.id, participants);
    return created;
  });
  return reportOf(session, membership, working, warningsOf(steps, plan));
}

async function readReport(
  session: Session,
  membership: Membership,
  working: WorkingRow,
): Promise<WorkingReport> {
  const { steps, plan } = await planFor(membership, working.spellId);
  // A complete working reports what it did, not what it would do now: the jars have moved since.
  const { status } = working;
  return reportOf(
    session,
    membership,
    working,
    status === 'complete' ? [] : warningsOf(steps, plan),
  );
}

/**
 * @throws {Forbidden} the caller may not read workings here.
 * @throws {NotFound} no such working here, or none this caller may read.
 */
export async function getWorking(
  session: Session,
  workspaceId: string,
  workingId: string,
): Promise<WorkingReport> {
  const membership = await assertMembership(session, workspaceId, { working: ['read'] });
  return readReport(session, membership, await readableWorking(membership, workingId));
}

/** Reports for a set of workings, reading their participants and deductions in one query each. */
async function reportsOf(
  session: Session,
  membership: Membership,
  workings: readonly WorkingRow[],
): Promise<WorkingReport[]> {
  const ids = workings.map((working) => working.id);
  const [participants, deductions] = await Promise.all([
    viewParticipants(session, membership, ids),
    findDeductionsOfWorkings(membership, ids),
  ]);
  return workings.map((working) => ({
    working,
    participants: participants.get(working.id) ?? [],
    deductions: deductions.filter((row) => row.workingId === working.id),
    warnings: [],
  }));
}

/**
 * @throws {Forbidden} the caller may not read workings here.
 */
export async function listWorkings(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<WorkingReport[]> {
  const membership = await assertMembership(session, workspaceId, { working: ['read'] });
  if (!isRowId(spellId)) return [];
  return reportsOf(session, membership, await findWorkingsInSpell(membership, spellId));
}

/**
 * The participants of the whole page are read in one query, and so are the deductions.
 *
 * @throws {Forbidden} the caller may not read workings here.
 */
export async function listWorkingsPage(
  session: Session,
  workspaceId: string,
  spellId: string,
  page: PageRequest,
): Promise<PageEntry<WorkingReport>[]> {
  const membership = await assertMembership(session, workspaceId, { working: ['read'] });
  if (!isRowId(spellId)) return [];
  const entries = await findWorkingsPage(membership, spellId, page);
  const reports = await reportsOf(
    session,
    membership,
    entries.map((entry) => entry.node),
  );
  return entries.map((entry, index) => ({ ...entry, node: reports[index] }));
}

/** One query per coven. */
export function workingCountsOf(
  session: Session,
  refs: readonly SpellKey[],
): Promise<(number | Forbidden)[]> {
  return perCoven(session, refs, async (membership, spellIds) => {
    const counts = new Map(
      (await findCompleteWorkingCounts(membership, spellIds)).map((row) => [
        row.spellId,
        row.count,
      ]),
    );
    return (spellId) => counts.get(spellId) ?? 0;
  });
}

/**
 * @throws {Forbidden} the caller may not read workings here.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function previewWorkingDeductions(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<WorkingDeductionPreview> {
  const membership = await assertMembership(session, workspaceId, { working: ['read'] });
  if (!isRowId(spellId)) throw new NotFound(NO_SUCH_SPELL);
  if (!(await findOneSpell(membership, spellId))) throw new NotFound(NO_SUCH_SPELL);
  const { steps, plan } = await planFor(membership, spellId);
  const deductions: PlannedDeduction[] = plan.flatMap((entry) =>
    entry.kind === 'take'
      ? [
          {
            stepId: entry.stepId,
            inventoryItemId: entry.inventoryItemId,
            quantity: entry.amount,
            unit: entry.unit,
            shortfall: entry.shortfall,
            before: entry.before,
            lowStockThreshold: entry.lowStockThreshold,
          },
        ]
      : [],
  );
  return { deductions, warnings: warningsOf(steps, plan) };
}

/**
 * A failing deduction leaves it a draft with nothing taken. What a jar lacks is taken to zero and the shortfall recorded.
 *
 * @throws {Forbidden} the caller may not change this working, is neither its recorder nor named on it, it is already complete, its spell is a draft, or its day is yet to come.
 * @throws {NotFound} no such working here, or none this caller may read.
 */
export async function completeWorking(
  session: Session,
  workspaceId: string,
  workingId: string,
): Promise<WorkingReport> {
  const membership = await assertMembership(session, workspaceId, { working: ['update'] });
  const working = await readableWorking(membership, workingId);
  await assertMayChange(membership, working);
  const { status } = working;
  if (status === 'complete') throw new Forbidden('This working is already complete');
  assertSpellComplete(await spellOf(membership, working), 'its workings cannot be completed');
  assertDayHasCome(working.workedOn);

  const warnings = await withAudit(session, async (write) => {
    // The coven's stock lock first, so the jars read below are the ones the decrements meet.
    await write.lockCovenStock(membership);
    const { steps, plan } = await planFor(membership, working.spellId);
    const [done] = await write.completeWorking(membership, workingId);
    if (!done) throw new Forbidden('This working is already complete');
    for (const entry of plan) {
      if (entry.kind !== 'take') continue;
      const { taken } = await write.decrementStock(membership, entry.inventoryItemId, entry.amount);
      await write.insert(spellWorkingDeductions, {
        workingId,
        spellStepId: entry.stepId,
        inventoryItemId: entry.inventoryItemId,
        quantity: taken.toFixed(QUANTITY_SCALE),
        unit: entry.unit,
        // What the plan wanted, less what was there to take: the plan's own shortfall plus any the jar lost since it was read.
        shortfall: (entry.amount + entry.shortfall - taken).toFixed(QUANTITY_SCALE),
      });
    }
    return warningsOf(steps, plan);
  });
  const done = await readableWorking(membership, workingId);
  return reportOf(session, membership, done, warnings);
}

/**
 * Visibility only widens once it is complete.
 *
 * @throws {Forbidden} the caller may not change this working, is neither its recorder nor named on it, asked to narrow a complete one, or moved a complete one past its day.
 * @throws {NotFound} no such working here, or none this caller may read.
 * @throws {ValidationError} the input is invalid, or a participant is not a member of this coven.
 */
export async function updateWorking(
  session: Session,
  workspaceId: string,
  workingId: string,
  input: unknown,
): Promise<WorkingReport> {
  const membership = await assertMembership(session, workspaceId, { working: ['update'] });
  const values = parseInput(WorkingInput, input);
  const working = await readableWorking(membership, workingId);
  await assertMayChange(membership, working);

  // A complete working is judged on the day it will hold after this write.
  if (working.status === 'complete') assertDayHasCome(values.workedOn);
  const { visibility: next } = values;
  if (next !== undefined) {
    assertWidens(working, next, 'working');
    assertWithinSpell(await spellOf(membership, working), next);
  }
  if (values.participants) await assertParticipantsAreMembers(membership, values.participants);

  const updated = await withAudit(session, async (write) => {
    const [row] = await write.updateById(spellWorkings, workingId, {
      workedOn: values.workedOn,
      note: values.note ?? null,
      ...(next === undefined ? {} : { visibility: next }),
    });
    if (!row) throw new NotFound(NO_SUCH_WORKING);
    if (values.participants) {
      await write.replaceWorkingParticipants(membership, workingId, values.participants);
    }
    return row;
  });
  return readReport(session, membership, updated);
}

/**
 * Stock is never touched: what a completed working took stays taken.
 *
 * @throws {Forbidden} the caller may not delete workings here, or did not record this one.
 * @throws {NotFound} no such working here, or none this caller may read.
 */
export async function deleteWorking(
  session: Session,
  workspaceId: string,
  workingId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { working: ['delete'] });
  const working = await readableWorking(membership, workingId);
  assertRecorder(membership, working);
  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIds(spellWorkings, [workingId]);
    if (!row) throw new NotFound(NO_SUCH_WORKING);
  });
}
