import type { ReactNode } from 'react';
import type { EditableWorking } from '../RecordWorking/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

/** What a complete working took for one ingredient step, in the jar's own unit. */
export interface WorkingDeductionView {
  id: string;
  /** The ingredient and form as the step names them. */
  name: string;
  quantity: string;
  unit: string;
}

/** One working as its row draws it, worked out by the page. */
export interface WorkingView {
  id: string;
  status: SpellStatus;
  visibility: SpellVisibility;
  /** The day it was worked, `YYYY-MM-DD`. */
  workedOn: string;
  note: string | null;
  /** The recorder under the name they last held; null when none is readable. */
  recordedBy: string | null;
  /** Each participant, a member under the name they last held or a typed name. */
  participants: readonly string[];
  deductions: readonly WorkingDeductionView[];
  /** One line saying how many steps completing a draft would skip (the Complete dialog gives the reasons); none on a complete working. */
  warnings?: readonly string[];
  /** The viewer recorded it and may delete it, which the Edit dialog's Delete Working follows. */
  canChange: boolean;
  /** What the Edit dialog opens on: given to the recorder and to a member named on the working. */
  editable?: EditableWorking;
}

export interface SpellWorkingsProps {
  /** Newest day first, as read. */
  workings: readonly WorkingView[];
  /** The control drawn beside the section heading (Record a Working), given only to a viewer who may record. */
  headingAction?: ReactNode;
  /** The control that completes a draft working, drawn on the draft rows the viewer may change (those carrying `editable`); `name` is the row's day in words, as `editAction` has it. */
  completeAction?: (workingId: string, workedOn: string, name: string) => ReactNode;
  /** The pencil that opens the Edit dialog on a working, drawn on the rows that carry `editable`; `plain` is true on a row that also shows Complete, where the pencil wears the text ink; `canDelete` is whether the viewer may delete it, which the Edit dialog's bin follows. */
  editAction?: (
    working: EditableWorking,
    name: string,
    plain: boolean,
    canDelete: boolean,
  ) => ReactNode;
}

/** The working Delete Working removes, in the coven it belongs to. */
export interface DeleteWorkingProps {
  workspaceId: string;
  workingId: string;
}
