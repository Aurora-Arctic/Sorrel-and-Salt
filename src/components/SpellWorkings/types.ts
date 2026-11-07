import type { ReactNode } from 'react';
import type { EditableWorking } from '../RecordWorking/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

export interface WorkingDeductionView {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface WorkingView {
  id: string;
  status: SpellStatus;
  visibility: SpellVisibility;
  /** The day it was worked, `YYYY-MM-DD`. */
  workedOn: string;
  note: string | null;
  recordedBy: string | null;
  participants: readonly string[];
  deductions: readonly WorkingDeductionView[];
  /** One line saying how many steps completing a draft would skip (the Complete dialog gives the reasons); none on a complete working. */
  warnings?: readonly string[];
  canChange: boolean;
  editable?: EditableWorking;
}

export interface SpellWorkingsProps {
  workings: readonly WorkingView[];
  headingAction?: ReactNode;
  completeAction?: (workingId: string, workedOn: string, name: string) => ReactNode;
  editAction?: (
    working: EditableWorking,
    name: string,
    plain: boolean,
    canDelete: boolean,
  ) => ReactNode;
}

export interface DeleteWorkingProps {
  workspaceId: string;
  workingId: string;
}
