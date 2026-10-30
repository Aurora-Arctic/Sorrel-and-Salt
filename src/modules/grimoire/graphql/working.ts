import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import { clearWorkingCount } from '../loaders/spell-children';
import { workingStatus } from '../schema/spell-workings';
import { spellVisibility } from '../schema/spells';
import {
  completeWorking,
  deleteWorking,
  listWorkingsPage,
  previewWorkingDeductions,
  recordWorking,
  updateWorking,
} from '../services/workings';
import type {
  PlannedDeduction,
  WorkingParticipantView,
  WorkingReport,
  WorkingWarning,
} from '../types';
import { SpellRef } from './spell';
import { InventoryUnitEnum } from '@/modules/ingredients';
import type { WorkingDeductionRow } from '@/db/repository';

// Workings over the wire: a spell's record of being made, who took part, and what it took from the jars. The resolvers hold
// no check and no query; the working service keeps a private working its recorder's in SQL (claude-docs/graphql/schema.md,
// "The grimoire"). A page's participants and deductions are read together by the service, and the count by a loader.

const WorkingStatusEnum = builder.enumType('WorkingStatus', { values: workingStatus.enumValues });

const WorkingVisibilityEnum = builder.enumType('WorkingVisibility', {
  description:
    'Who reads a working: its recorder alone, or every member of the coven. Never wider than its spell.',
  values: spellVisibility.enumValues,
});

const NotDeductedReasonEnum = builder.enumType('NotDeductedReason', {
  description:
    'Why a step takes nothing from the jars: CUSTOM, a typed-name step; UNSTOCKED, a form the coven holds no jar of; NO_QUANTITY, a step with no amount; UNITS_DIFFER, a unit the jar cannot be measured in; JAR_NOT_MEASURED, a jar kept without an amount.',
  values: {
    CUSTOM: { value: 'custom' },
    UNSTOCKED: { value: 'unstocked' },
    NO_QUANTITY: { value: 'no-quantity' },
    UNITS_DIFFER: { value: 'units-differ' },
    JAR_NOT_MEASURED: { value: 'jar-not-measured' },
  },
} as const);

const WorkingParticipantRef = builder
  .objectRef<WorkingParticipantView>('WorkingParticipant')
  .implement({
    description:
      'Someone who took part in a working: a coven member, or a name typed for anyone else.',
    fields: (t) => ({
      id: t.exposeID('id'),
      userId: t.exposeID('userId', { nullable: true, description: 'Null for a typed name.' }),
      name: t.string({
        description:
          'The typed name as typed; for a member, the name their row last held, or null if none is readable.',
        nullable: true,
        resolve: (participant) => participant.name ?? participant.displayName,
      }),
    }),
  });

const WorkingDeductionRef = builder.objectRef<WorkingDeductionRow>('WorkingDeduction').implement({
  description: 'What a completed working took from one jar for one step, in the jar’s own unit.',
  fields: (t) => ({
    id: t.exposeID('id'),
    stepId: t.exposeID('spellStepId'),
    inventoryItemId: t.exposeID('inventoryItemId'),
    quantity: t.float({ resolve: (row) => Number(row.quantity) }),
    unit: t.expose('unit', { type: InventoryUnitEnum }),
    shortfall: t.float({
      description: 'What the jar could not cover; 0 when fully met.',
      resolve: (row) => Number(row.shortfall),
    }),
  }),
});

const WorkingWarningRef = builder.objectRef<WorkingWarning>('WorkingWarning').implement({
  description: 'A step a working took nothing for, and why.',
  fields: (t) => ({
    stepId: t.exposeID('stepId'),
    position: t.exposeInt('position'),
    stepName: t.exposeString('stepName', { nullable: true }),
    reason: t.expose('reason', { type: NotDeductedReasonEnum }),
  }),
});

const PlannedDeductionRef = builder.objectRef<PlannedDeduction>('PlannedDeduction').implement({
  description: 'What completing a working would take from one jar for one step.',
  fields: (t) => ({
    stepId: t.exposeID('stepId'),
    inventoryItemId: t.exposeID('inventoryItemId'),
    quantity: t.exposeFloat('quantity'),
    unit: t.expose('unit', { type: InventoryUnitEnum }),
    shortfall: t.exposeFloat('shortfall'),
    before: t.exposeFloat('before', {
      description: 'What the jar held before this take, in the jar unit.',
    }),
    lowStockThreshold: t.exposeFloat('lowStockThreshold', {
      nullable: true,
      description: 'The jar Low mark, in the jar unit.',
    }),
  }),
});

const WorkingRef = builder.objectRef<WorkingReport>('SpellWorking').implement({
  description:
    'One time a spell was made: when, by whom, how it went, and what it took from the jars.',
  fields: (t) => ({
    id: t.id({ resolve: ({ working }) => working.id }),
    spellId: t.id({ resolve: ({ working }) => working.spellId }),
    status: t.field({
      type: WorkingStatusEnum,
      resolve: ({ working }) => working.status,
    }),
    workedOn: t.field({
      type: 'LocalDate',
      description: 'The day it was made, which is not the day it was recorded.',
      resolve: ({ working }) => working.workedOn,
    }),
    completedAt: t.field({
      type: 'DateTime',
      nullable: true,
      description: 'Null while a draft.',
      resolve: ({ working }) => working.completedAt,
    }),
    note: t.string({ nullable: true, resolve: ({ working }) => working.note }),
    visibility: t.field({
      type: WorkingVisibilityEnum,
      resolve: ({ working }) => working.visibility,
    }),
    participants: t.field({
      type: [WorkingParticipantRef],
      resolve: (report) => report.participants,
    }),
    deductions: t.field({
      type: [WorkingDeductionRef],
      description: 'What completion took from the jars; empty on a draft.',
      resolve: (report) => report.deductions,
    }),
    warnings: t.field({
      type: [WorkingWarningRef],
      description: 'Steps completion took nothing for; empty unless this answers a completion.',
      resolve: (report) => report.warnings,
    }),
    audit: t.field({ type: AuditInfo, resolve: ({ working }) => working }),
  }),
});

builder.objectField(SpellRef, 'workings', (t) =>
  t.pagedConnection({
    type: WorkingRef,
    description:
      'The workings of this spell the caller may read, newest day first: every shared one and the caller’s own private ones.',
    resolve: (spell, _args, page, context) =>
      listWorkingsPage(sessionOf(context), spell.workspaceId, spell.id, page),
  }),
);

builder.objectField(SpellRef, 'workingCount', (t) =>
  t.int({
    description: 'How many complete workings of this spell the caller may read.',
    resolve: (spell, _args, { loaders }) =>
      loaders.workingCountBySpell.load({ id: spell.id, workspaceId: spell.workspaceId }),
  }),
);

const WorkingParticipantInputRef = builder.inputType('WorkingParticipantInput', {
  description: 'A coven member by `userId`, or a name typed for anyone else: exactly one.',
  fields: (t) => ({
    userId: t.id(),
    name: t.string(),
  }),
});

const WorkingInputRef = builder.inputType('WorkingInput', {
  description:
    'A working as recorded or changed. On a change, a field left out keeps its value; `note` null clears it.',
  fields: (t) => ({
    workedOn: t.field({ type: 'LocalDate', required: true }),
    note: t.string(),
    participants: t.field({
      type: [WorkingParticipantInputRef],
      description: 'In order. Left out: on record, the recorder alone; on change, unchanged.',
    }),
    visibility: t.field({
      type: WorkingVisibilityEnum,
      description:
        'Left out: on record, the coven, capped at the spell’s; on change, unchanged. A complete working only widens.',
    }),
  }),
});

const CompleteWorkingResultRef = builder
  .objectRef<WorkingReport>('CompleteWorkingResult')
  .implement({
    description: 'A completed working, and the steps it took nothing for.',
    fields: (t) => ({
      working: t.field({ type: WorkingRef, resolve: (report) => report }),
      warnings: t.field({ type: [WorkingWarningRef], resolve: (report) => report.warnings }),
    }),
  });

const WorkingDeductionPreviewRef = builder
  .objectRef<{ deductions: PlannedDeduction[]; warnings: WorkingWarning[] }>(
    'WorkingDeductionPreview',
  )
  .implement({
    description:
      'What completing a working would do to the jars now, and what it would take nothing for.',
    fields: (t) => ({
      deductions: t.field({ type: [PlannedDeductionRef], resolve: (p) => p.deductions }),
      warnings: t.field({ type: [WorkingWarningRef], resolve: (p) => p.warnings }),
    }),
  });

builder.queryField('workingDeductionPreview', (t) =>
  t.field({
    type: WorkingDeductionPreviewRef,
    description:
      'What completing a working of this spell would take from the coven’s jars now: the plan completion follows, read and not applied.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      spellId: t.arg.id({ required: true }),
    },
    resolve: (_root, { workspaceId, spellId }, context) =>
      previewWorkingDeductions(sessionOf(context), workspaceId, spellId),
  }),
);

builder.mutationField('recordWorking', (t) =>
  t.field({
    type: WorkingRef,
    description: 'Records a working of a complete spell, as a draft.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      spellId: t.arg.id({ required: true }),
      input: t.arg({ type: WorkingInputRef, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, spellId, input }, context) =>
      recordWorking(sessionOf(context), workspaceId, spellId, input),
  }),
);

builder.mutationField('updateWorking', (t) =>
  t.field({
    type: WorkingRef,
    description: 'Changes a working its recorder made.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
      input: t.arg({ type: WorkingInputRef, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, id, input }, context) =>
      updateWorking(sessionOf(context), workspaceId, id, input),
  }),
);

builder.mutationField('completeWorking', (t) =>
  t.field({
    type: CompleteWorkingResultRef,
    description:
      'Completes a draft working, taking what the recipe used from the coven’s jars. Answers the steps it took nothing for.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id }, { loaders, ...context }) => {
      const report = await completeWorking(sessionOf(context), workspaceId, id);
      clearWorkingCount(loaders, { id: report.working.spellId, workspaceId });
      return report;
    },
  }),
);

// Answers the deleted id: the page leaves by it, and its spell is not known here.
builder.mutationField('deleteWorking', (t) =>
  t.id({
    description: 'Soft-deletes a working its recorder made.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id }, context) => {
      await deleteWorking(sessionOf(context), workspaceId, id);
      return id;
    },
  }),
);
